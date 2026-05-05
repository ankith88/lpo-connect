import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { requestNotificationPermission, saveTokenToFirestore } from '../utils/notifications';

interface LpoMetadata {
  id: string;
  name: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  franchiseeTerritoryJSON?: string | string[];
}

interface UserMetadata {
  uid: string;
  email: string;
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
  setSelectedLpoId: (id: string) => void;
  allLpos: LpoMetadata[];
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
  allLpos: [],
});

export const LpoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserMetadata | null>(null);
  const [lpo, setLpo] = useState<LpoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);
  const [selectedLpoId, setSelectedLpoId] = useState<string>('all');
  const [allLpos, setAllLpos] = useState<LpoMetadata[]>([]);

  const isAdmin = userData?.role === 'admin' || userData?.uid === SUPER_ADMIN_ID;

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

          if (userDoc.exists()) {
            const data = userDoc.data() as UserMetadata;
            setUserData({ ...data, uid: user.uid });
            const lpoId = data.lpo_id;
            setHasCompletedTour(data.hasCompletedTour || false);
            
            // Set initial filter to user's LPO if they are not an admin
            if (data.role !== 'admin' && user.uid !== SUPER_ADMIN_ID) {
              setSelectedLpoId(lpoId);
            }

            if (lpoId) {
              const lpoDoc = await getDoc(doc(db, 'lpo', lpoId));
              if (lpoDoc.exists()) {
                setLpo({ id: lpoId, ...lpoDoc.data() } as LpoMetadata);
                
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
              role: 'admin', 
              lpo_id: '',
              hasCompletedTour: true
            };
            setUserData(adminData);
            
            // Create the document asynchronously
            const { setDoc, doc } = await import('firebase/firestore');
            setDoc(doc(db, 'users', user.uid), adminData).catch(e => console.error("Auto-seed error:", e));
          }

          // If admin, fetch all LPOs for the filter list
          if (user.uid === SUPER_ADMIN_ID || userDoc.data()?.role === 'admin') {
            const { getDocs, collection } = await import('firebase/firestore');
            const lposSnapshot = await getDocs(collection(db, 'lpo'));
            setAllLpos(lposSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LpoMetadata)));
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
      allLpos
    }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
