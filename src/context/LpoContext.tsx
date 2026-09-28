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
  selectedLpoId: string; // Used by admins to filter, defaults to own lpo_id or 'all'
  setSelectedLpoId: (id: string | string[]) => void;
  selectedLpoIds: string[];
  setSelectedLpoIds: (ids: string[]) => void;
  allLpos: LpoMetadata[];
  awaitingTcCount: number;
}

const SUPER_ADMIN_ID = 'lwOQ8j5MSIdOiyR0VZ1zEvfpx7A3';

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
  const [userData, setUserData] = useState<UserMetadata | null>(null);
  const [lpo, setLpo] = useState<LpoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);
  const [selectedLpoIds, setSelectedLpoIds] = useState<string[]>(['all']);
  const [allLpos, setAllLpos] = useState<LpoMetadata[]>([]);
  const [awaitingTcCount, setAwaitingTcCount] = useState(0);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin' || userData?.uid === SUPER_ADMIN_ID;

  const selectedLpoId = selectedLpoIds.includes('all') || selectedLpoIds.length === 0 ? 'all' : selectedLpoIds[0];

  const setSelectedLpoId = (idOrIds: string | string[]) => {
    if (Array.isArray(idOrIds)) {
      setSelectedLpoIds(idOrIds.length > 0 ? idOrIds : ['all']);
    } else {
      setSelectedLpoIds(idOrIds ? [idOrIds] : ['all']);
    }
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
            setUserData({ ...data, uid: user.uid });
            const lpoId = data.lpo_id;
            setHasCompletedTour(data.hasCompletedTour || false);
            
            isUserAdmin = isUserAdmin || data.role === 'admin' || data.role === 'superadmin';

            // Set initial filter to user's LPO if they are not an admin
            if (!isUserAdmin && lpoId) {
              setSelectedLpoIds([lpoId]);
            }

            if (lpoId) {
              const lpoDoc = await getDoc(doc(db, 'lpo', lpoId));
              if (lpoDoc.exists()) {
                const docData = lpoDoc.data();
                const resolvedName = resolveLpoName(lpoId, docData);
                const userLpo = { id: lpoId, ...docData, name: resolvedName } as LpoMetadata;
                setLpo(userLpo);
                
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
            setUserData(adminData);
            isUserAdmin = true;
            
            // Create the document asynchronously
            setDoc(doc(db, 'users', user.uid), adminData).catch(e => console.error("Auto-seed error:", e));
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
          }

        } catch (error) {
          console.error("Error fetching LPO metadata:", error);
        }
      } else {
        setUserData(null);
        setLpo(null);
        setHasCompletedTour(true);
        setAllLpos([]);
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
      if (selectedLpoIds.includes('all') || selectedLpoIds.length === 0) {
        q = query(reqRef, where('status', '==', 'awaiting-activation'));
      } else if (selectedLpoIds.length === 1) {
        q = query(reqRef, where('status', '==', 'awaiting-activation'), where('lpo_id', '==', selectedLpoIds[0]));
      } else {
        q = query(reqRef, where('status', '==', 'awaiting-activation'), where('lpo_id', 'in', selectedLpoIds.slice(0, 30)));
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
  }, [user, isAdmin, selectedLpoIds, userData?.lpo_id]);

  const completeTour = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { hasCompletedTour: true });
      setHasCompletedTour(true);
      setUserData(prev => prev ? { ...prev, hasCompletedTour: true } : null);
    } catch (error) {
      console.error("Error completing tour:", error);
      // Even if firestore fails, we set it locally to hide it for the current session
      setHasCompletedTour(true);
    }
  };

  const updateUserData = async (data: Partial<UserMetadata>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
      setUserData(prev => prev ? { ...prev, ...data } : null);
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
      selectedLpoId,
      setSelectedLpoId,
      selectedLpoIds,
      setSelectedLpoIds,
      allLpos,
      awaitingTcCount
    }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
