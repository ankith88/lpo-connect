import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { requestNotificationPermission, saveTokenToFirestore } from '../utils/notifications';

interface LpoMetadata {
  id: string;
  name: string;
  location: string;
  address: string;
  franchiseeTerritoryJSON?: string | string[];
}

interface LpoContextType {
  user: User | null;
  lpo: LpoMetadata | null;
  loading: boolean;
}

const LpoContext = createContext<LpoContextType>({
  user: null,
  lpo: null,
  loading: true,
});

export const LpoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [lpo, setLpo] = useState<LpoMetadata | null>(null);
  const [loading, setLoading] = useState(true);

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
            const lpoId = userDoc.data().lpo_id;
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <LpoContext.Provider value={{ user, lpo, loading }}>
      {children}
    </LpoContext.Provider>
  );
};

export const useLpo = () => useContext(LpoContext);
