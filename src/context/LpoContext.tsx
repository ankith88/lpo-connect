import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { requestNotificationPermission, saveTokenToFirestore } from '../utils/notifications';

export interface LpoMetadata {
  id: string;
  name: string;
  location?: string;
  address?: string;
  address1?: string;
  city?: string;
  suburb?: string;
  state?: string;
  zip?: string;
  postcode?: string;
  latitude?: number | string;
  longitude?: number | string;
  franchiseeTerritoryJSON?: string | string[];
  lpoServiceAdditionalLPOBagRate?: string;
  [key: string]: any;
}

interface UserMetadata {
  uid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  role: string; // 'admin' or 'operator'
  lpo_id: string;
  hasCompletedTour?: boolean;
}

export interface ImpersonatedSession {
  uid: string;
  email: string;
  lpo_id: string;
  lpoName?: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
}

interface LpoContextType {
  user: User | null;
  userData: UserMetadata | null;
  lpo: LpoMetadata | null;
  loading: boolean;
  isSidebarPinned: boolean;
  setIsSidebarPinned: (pinned: boolean) => void;
  hasCompletedTour: boolean;
  completeTour: () => Promise<void>;
  updateUserData: (data: Partial<UserMetadata>) => Promise<void>;
  isAdmin: boolean;
  isRealAdmin: boolean;
  isImpersonating: boolean;
  impersonatedSession: ImpersonatedSession | null;
  loginAsLpo: (target: ImpersonatedSession) => Promise<void>;
  exitImpersonation: () => void;
  selectedLpoId: string; // Used by admins to filter, defaults to own lpo_id or 'all'
  setSelectedLpoId: (id: string | string[]) => void;
  selectedLpoIds: string[];
  setSelectedLpoIds: (ids: string[]) => void;
  allLpos: LpoMetadata[];
  awaitingTcCount: number;
}

const SUPER_ADMIN_ID = 'lwOQ8j5MSIdOiyR0VZ1zEvfpx7A3';
const IMPERSONATION_SESSION_KEY = 'lpo_impersonation_session';
const IMPERSONATION_LPO_KEY = 'lpo_impersonation_lpo';

const LpoContext = createContext<LpoContextType>({
  user: null,
  userData: null,
  lpo: null,
  loading: true,
  isSidebarPinned: false,
  setIsSidebarPinned: () => {},
  hasCompletedTour: true,
  completeTour: async () => {},
  updateUserData: async () => {},
  isAdmin: false,
  isRealAdmin: false,
  isImpersonating: false,
  impersonatedSession: null,
  loginAsLpo: async () => {},
  exitImpersonation: () => {},
  selectedLpoId: 'all',
  setSelectedLpoId: () => {},
  selectedLpoIds: ['all'],
  setSelectedLpoIds: () => {},
  allLpos: [],
  awaitingTcCount: 0,
});

export const resolveLpoName = (docId: string, data: any): string => {
  if (!data) return docId;
  
  // List of possible text fields that hold the human-readable name in priority order
  const textCandidates = [
    data.name,
    data.lpoName,
    data.lpo_name,
    data.lponame,
    data.companyName,
    data.company_name,
    data.companyname,
    data.franchiseeText,
    data.franchiseeName,
    data.franchisee_name,
    data.altname,
    data.altName,
    data.title,
    data.location,
    data.lpoLocation,
    data.suburb,
    data.city,
    data.address,
    data.address1
  ];

  // 1. Look for the first non-empty candidate that is NOT purely numbers and not just the docId
  for (const candidate of textCandidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed && !/^\d+$/.test(trimmed) && trimmed !== docId) {
        return trimmed.replace(/\s+lpo\s+lpo$/i, ' LPO');
      }
    }
  }

  // 2. If all text candidates were numeric or identical to docId, check if suburb/city/location can be formatted
  const locationPart = (typeof data.suburb === 'string' && data.suburb.trim()) || 
                       (typeof data.city === 'string' && data.city.trim()) || 
                       (typeof data.location === 'string' && data.location.trim()) || 
                       (typeof data.address === 'string' && data.address.trim()) ||
                       '';

  if (locationPart && !/^\d+$/.test(locationPart)) {
    const cleanLocation = locationPart.replace(/\s+lpo$/i, '').trim();
    return `${cleanLocation} LPO`;
  }

  // 3. Fallback to candidate if any string exists
  for (const candidate of textCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return docId;
};

export const LpoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [realUserData, setRealUserData] = useState<UserMetadata | null>(null);
  const [realLpo, setRealLpo] = useState<LpoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [hasCompletedTourState, setHasCompletedTourState] = useState(true);
  const [allLpos, setAllLpos] = useState<LpoMetadata[]>([]);
  const [awaitingTcCount, setAwaitingTcCount] = useState(0);

  const [impersonatedSession, setImpersonatedSession] = useState<ImpersonatedSession | null>(() => {
    try {
      const saved = localStorage.getItem(IMPERSONATION_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [impersonatedLpo, setImpersonatedLpo] = useState<LpoMetadata | null>(() => {
    try {
      const saved = localStorage.getItem(IMPERSONATION_LPO_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedLpoIds, setSelectedLpoIdsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(IMPERSONATION_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.lpo_id) return [parsed.lpo_id];
      }
    } catch {}
    return ['all'];
  });

  const isRealAdmin =
    realUserData?.role === 'admin' ||
    realUserData?.role === 'superadmin' ||
    realUserData?.uid === SUPER_ADMIN_ID ||
    user?.uid === SUPER_ADMIN_ID;

  const isImpersonating = Boolean(isRealAdmin && impersonatedSession?.lpo_id);

  // When impersonating an LPO, act as that LPO operator across LPO views
  const isAdmin = isRealAdmin && !isImpersonating;

  const userData: UserMetadata | null = isImpersonating && impersonatedSession
    ? {
        uid: impersonatedSession.uid,
        email: impersonatedSession.email,
        first_name: impersonatedSession.first_name,
        last_name: impersonatedSession.last_name,
        mobile: impersonatedSession.mobile,
        role: 'operator',
        lpo_id: impersonatedSession.lpo_id,
        hasCompletedTour: true,
      }
    : realUserData;

  const lpo: LpoMetadata | null = isImpersonating
    ? (impersonatedLpo || allLpos.find(l => l.id === impersonatedSession?.lpo_id) || null)
    : realLpo;

  const hasCompletedTour = isImpersonating ? true : hasCompletedTourState;

  const effectiveSelectedLpoIds = isImpersonating && impersonatedSession?.lpo_id
    ? [impersonatedSession.lpo_id]
    : selectedLpoIds;

  const selectedLpoId =
    effectiveSelectedLpoIds.includes('all') || effectiveSelectedLpoIds.length === 0
      ? 'all'
      : effectiveSelectedLpoIds[0];

  const setSelectedLpoIds = (ids: string[]) => {
    if (isImpersonating && impersonatedSession?.lpo_id) {
      setSelectedLpoIdsState([impersonatedSession.lpo_id]);
      return;
    }
    setSelectedLpoIdsState(ids);
  };

  const setSelectedLpoId = (idOrIds: string | string[]) => {
    if (isImpersonating && impersonatedSession?.lpo_id) {
      setSelectedLpoIdsState([impersonatedSession.lpo_id]);
      return;
    }
    if (Array.isArray(idOrIds)) {
      setSelectedLpoIdsState(idOrIds.length > 0 ? idOrIds : ['all']);
    } else {
      setSelectedLpoIdsState(idOrIds ? [idOrIds] : ['all']);
    }
  };

  const loginAsLpo = async (target: ImpersonatedSession) => {
    if (!target.lpo_id) return;

    let resolvedLpo: LpoMetadata | null = allLpos.find(l => l.id === target.lpo_id) || null;
    try {
      const lpoDoc = await getDoc(doc(db, 'lpo', target.lpo_id));
      if (lpoDoc.exists()) {
        const docData = lpoDoc.data();
        const resolvedName = resolveLpoName(target.lpo_id, docData);
        resolvedLpo = { id: target.lpo_id, ...docData, name: resolvedName } as LpoMetadata;
      }
    } catch (err) {
      console.error("Error fetching LPO doc during impersonation:", err);
    }

    if (!resolvedLpo) {
      resolvedLpo = {
        id: target.lpo_id,
        name: target.lpoName || target.lpo_id,
      };
    }

    const sessionPayload: ImpersonatedSession = {
      ...target,
      lpoName: resolvedLpo.name || target.lpoName || target.lpo_id,
    };

    localStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(sessionPayload));
    localStorage.setItem(IMPERSONATION_LPO_KEY, JSON.stringify(resolvedLpo));

    setImpersonatedSession(sessionPayload);
    setImpersonatedLpo(resolvedLpo);
    setSelectedLpoIdsState([target.lpo_id]);
  };

  const exitImpersonation = () => {
    localStorage.removeItem(IMPERSONATION_SESSION_KEY);
    localStorage.removeItem(IMPERSONATION_LPO_KEY);
    setImpersonatedSession(null);
    setImpersonatedLpo(null);
    setSelectedLpoIdsState(['all']);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user mapping to LPO
        try {
          // Primary lookup by UID
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          
          // Fallback lookup by email if UID not found (useful for initial seeding)
          if (!userDoc.exists() && user.email) {
            userDoc = await getDoc(doc(db, 'users', user.email));
          }

          let isUserAdmin = user.uid === SUPER_ADMIN_ID;

          if (userDoc.exists()) {
            const data = userDoc.data() as UserMetadata;
            setRealUserData({ ...data, uid: user.uid });
            const lpoId = data.lpo_id;
            setHasCompletedTourState(data.hasCompletedTour || false);
            
            isUserAdmin = isUserAdmin || data.role === 'admin' || data.role === 'superadmin';

            // Set initial filter to user's LPO if they are not an admin
            if (!isUserAdmin && lpoId) {
              setSelectedLpoIdsState([lpoId]);
            }

            if (lpoId) {
              const lpoDoc = await getDoc(doc(db, 'lpo', lpoId));
              if (lpoDoc.exists()) {
                const docData = lpoDoc.data();
                const resolvedName = resolveLpoName(lpoId, docData);
                const userLpo = { id: lpoId, ...docData, name: resolvedName } as LpoMetadata;
                setRealLpo(userLpo);
                
                if (!isUserAdmin) {
                  setAllLpos([userLpo]);
                }

                // Request and save FCM token for operator
                requestNotificationPermission().then(token => {
                  if (token) {
                    saveTokenToFirestore(token, 'operator', user.uid);
                  }
                });
              }
            }
          } else if (user.uid === SUPER_ADMIN_ID) {
            // Auto-seed the Super Admin record if it doesn't exist
            const adminData = { 
              uid: user.uid, 
              email: user.email || '', 
              role: 'superadmin', 
              lpo_id: '',
              hasCompletedTour: true
            };
            setRealUserData(adminData);
            isUserAdmin = true;
            
            // Create the document asynchronously
            setDoc(doc(db, 'users', user.uid), adminData).catch(e => console.error("Auto-seed error:", e));
          }

          if (!isUserAdmin) {
            // Clear any stale impersonation state if a non-admin signs in
            localStorage.removeItem(IMPERSONATION_SESSION_KEY);
            localStorage.removeItem(IMPERSONATION_LPO_KEY);
            setImpersonatedSession(null);
            setImpersonatedLpo(null);
          }

          // If admin, fetch all active LPOs for the filter list
          if (isUserAdmin) {
            const lposSnapshot = await getDocs(collection(db, 'lpo'));
            const sanitizedLpos = lposSnapshot.docs
              .filter(doc => {
                const data = doc.data();
                // Filter out disabled or lost accounts
                if (data.disabled === true || data.status === 'Lost' || data.status === 'inactive') {
                  return false;
                }
                // Must have at least one valid name/location field
                const hasName = data.name || data.location || data.companyName || data.lpoName || data.franchiseeText || data.city || data.suburb;
                return Boolean(hasName);
              })
              .map(doc => {
                const data = doc.data();
                const resolvedName = resolveLpoName(doc.id, data);
                return {
                  id: doc.id,
                  ...data,
                  name: resolvedName,
                } as LpoMetadata;
              })
              .filter(l => Boolean(l.id && l.name && !/^\d+$/.test(l.name)))
              .sort((a, b) => a.name.localeCompare(b.name));
            setAllLpos(sanitizedLpos);

            // Refresh impersonated LPO metadata if active
            const savedSessionStr = localStorage.getItem(IMPERSONATION_SESSION_KEY);
            if (savedSessionStr) {
              try {
                const savedSession = JSON.parse(savedSessionStr) as ImpersonatedSession;
                if (savedSession?.lpo_id) {
                  const matched = sanitizedLpos.find(l => l.id === savedSession.lpo_id);
                  if (matched) {
                    setImpersonatedLpo(matched);
                    localStorage.setItem(IMPERSONATION_LPO_KEY, JSON.stringify(matched));
                  } else {
                    const impDoc = await getDoc(doc(db, 'lpo', savedSession.lpo_id));
                    if (impDoc.exists()) {
                      const docData = impDoc.data();
                      const resolvedName = resolveLpoName(savedSession.lpo_id, docData);
                      const fullImpLpo = { id: savedSession.lpo_id, ...docData, name: resolvedName } as LpoMetadata;
                      setImpersonatedLpo(fullImpLpo);
                      localStorage.setItem(IMPERSONATION_LPO_KEY, JSON.stringify(fullImpLpo));
                    }
                  }
                  setSelectedLpoIdsState([savedSession.lpo_id]);
                }
              } catch (e) {
                console.error("Failed to restore impersonated LPO:", e);
              }
            }
          }

        } catch (error) {
          console.error("Error fetching LPO metadata:", error);
        }
      } else {
        setRealUserData(null);
        setRealLpo(null);
        setHasCompletedTourState(true);
        setAllLpos([]);
        localStorage.removeItem(IMPERSONATION_SESSION_KEY);
        localStorage.removeItem(IMPERSONATION_LPO_KEY);
        setImpersonatedSession(null);
        setImpersonatedLpo(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for Awaiting T&C Requests
  useEffect(() => {
    if (!user) {
      setAwaitingTcCount(0);
      return;
    }

    const reqRef = collection(db, 'requests');
    let q;
    
    if (isAdmin) {
      if (effectiveSelectedLpoIds.includes('all') || effectiveSelectedLpoIds.length === 0) {
        q = query(reqRef, where('status', '==', 'awaiting-activation'));
      } else if (effectiveSelectedLpoIds.length === 1) {
        q = query(reqRef, where('status', '==', 'awaiting-activation'), where('lpo_id', '==', effectiveSelectedLpoIds[0]));
      } else {
        q = query(reqRef, where('status', '==', 'awaiting-activation'), where('lpo_id', 'in', effectiveSelectedLpoIds.slice(0, 30)));
      }
    } else if (userData?.lpo_id) {
      q = query(reqRef, where('status', '==', 'awaiting-activation'), where('lpo_id', '==', userData.lpo_id));
    } else {
      setAwaitingTcCount(0);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAwaitingTcCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user, isAdmin, effectiveSelectedLpoIds, userData?.lpo_id]);

  const completeTour = async () => {
    if (!user || isImpersonating) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { hasCompletedTour: true });
      setHasCompletedTourState(true);
      setRealUserData(prev => prev ? { ...prev, hasCompletedTour: true } : null);
    } catch (error) {
      console.error("Error completing tour:", error);
      // Even if firestore fails, we set it locally to hide it for the current session
      setHasCompletedTourState(true);
    }
  };

  const updateUserData = async (data: Partial<UserMetadata>) => {
    if (!user) return;
    try {
      const targetUid = isImpersonating && impersonatedSession?.uid && !impersonatedSession.uid.startsWith('lpo_')
        ? impersonatedSession.uid
        : user.uid;
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, data);
      if (isImpersonating && impersonatedSession) {
        const updatedSession = { ...impersonatedSession, ...data };
        setImpersonatedSession(updatedSession);
        localStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(updatedSession));
      } else {
        setRealUserData(prev => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  return (
    <LpoContext.Provider value={{ 
      user, 
      userData, 
      lpo, 
      loading, 
      isSidebarPinned, 
      setIsSidebarPinned, 
      hasCompletedTour, 
      completeTour,
      updateUserData,
      isAdmin,
      isRealAdmin,
      isImpersonating,
      impersonatedSession,
      loginAsLpo,
      exitImpersonation,
      selectedLpoId,
      setSelectedLpoId,
      selectedLpoIds: effectiveSelectedLpoIds,
      setSelectedLpoIds,
      allLpos,
      awaitingTcCount
    }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
