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
  
  // Use data payload exclusively to prevent OS double-notifications
  const notificationTitle = payload.data?.title || payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body,
    icon: '/favicon.svg',
    data: {
      url: payload.data?.link || payload.fcmOptions?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Check if the specific URL is already open in a tab
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If not, but any app window is open, just focus and navigate it
      if (windowClients.length > 0) {
        if (windowClients[0].navigate) {
          return windowClients[0].navigate(urlToOpen).then(c => c.focus());
        }
      }
      // 3. If no windows are open at all, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
