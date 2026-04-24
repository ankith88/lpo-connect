importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDklo95QYbj4PGZeKAqRBBzCfFKc9CFoXs",
  authDomain: "mp-lpo-connect.firebaseapp.com",
  projectId: "mp-lpo-connect",
  storageBucket: "mp-lpo-connect.firebasestorage.app",
  messagingSenderId: "672243562252",
  appId: "1:672243562252:web:fa94020bf1184b4d817b29"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
