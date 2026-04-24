import { messaging, db } from '../firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';



export const requestNotificationPermission = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: "BFzv_rsja-IA7KrBazIT8Y4aq9VyMPrqJ4YUbPskhHCTy2q1XSPpiJddqkOVnz-tvZ1ZLLZyGBQYGoDxtHYG6mI" // Replace with actual public VAPID key from Firebase Console
      });
      return token;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
};

export const saveTokenToFirestore = async (token: string, type: 'operator' | 'customer', id: string) => {
  try {
    if (type === 'operator') {
      // Save to users/{id}
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
      });
    } else {
      // Save to requests/{id}
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, {
        customerTokens: arrayUnion(token)
      });
    }
  } catch (error) {
    console.error('Error saving FCM token to Firestore:', error);
  }
};

export const onForegroundMessage = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload: MessagePayload) => {
    console.log('Foreground message received:', payload);
    // You can use a toast or browser notification here
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'New Message', {
        body: payload.notification?.body,
        icon: '/favicon.svg'
      });
    }
  });
};
