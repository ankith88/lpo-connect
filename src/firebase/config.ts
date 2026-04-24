import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// TODO: Replace with actual Firebase config from USER
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDklo95QYbj4PGZeKAqRBBzCfFKc9CFoXs",
  authDomain: "mp-lpo-connect.firebaseapp.com",
  projectId: "mp-lpo-connect",
  storageBucket: "mp-lpo-connect.firebasestorage.app",
  messagingSenderId: "672243562252",
  appId: "1:672243562252:web:fa94020bf1184b4d817b29",
  measurementId: "G-EBKDN66SWJ"
};

export const googleMapsApiKey = "AIzaSyC3uWNpVJ7jFsGyWUKkzQGkDJGrW4yY-2o";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "lpoconnect");
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export default app;
