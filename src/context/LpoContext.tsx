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

interface LpoContextType {
  user: User | null;
  lpo: LpoMetadata | null;
  loading: boolean;
  isSidebarPinned: boolean;
  setIsSidebarPinned: (pinned: boolean) => void;
  hasCompletedTour: boolean;
  completeTour: () => Promise<void>;
}

const LpoContext = createContext<LpoContextType>({
  user: null,
  lpo: null,
  loading: true,
  isSidebarPinned: false,
  setIsSidebarPinned: () => {},
  hasCompletedTour: true, // Default to true to avoid showing it while loading
  completeTour: async () => {},
});

export const LpoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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
            const userData = userDoc.data();
            const lpoId = userData.lpo_id;
            setHasCompletedTour(userData.hasCompletedTour || false);

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
    } catch (error) {
      console.error("Error completing tour:", error);
      // Even if firestore fails, we set it locally to hide it for the current session
      setHasCompletedTour(true);
    }
  };

  return (
    <LpoContext.Provider value={{ 
      user, 
      lpo, 
      loading, 
      isSidebarPinned, 
      setIsSidebarPinned, 
      hasCompletedTour, 
      completeTour 
    }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
