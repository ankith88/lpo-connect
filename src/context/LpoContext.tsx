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
  role: string;
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
}

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
});

export const LpoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserMetadata | null>(null);
  const [lpo, setLpo] = useState<LpoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

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
        } catch (error) {
          console.error("Error fetching LPO metadata:", error);
        }
      } else {
        setUserData(null);
        setLpo(null);
        setHasCompletedTour(true);
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
      updateUserData
    }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
