// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
    apiKey: "AIzaSyA0d0DMT2Jbbb-YzpTqKgBUXKkWO9nDXCE",
    authDomain: "pettrust-bogota.firebaseapp.com",
    projectId: "pettrust-bogota",
    storageBucket: "pettrust-bogota.firebasestorage.app",
    messagingSenderId: "16084338804",
    appId: "1:16084338804:web:6d06145e53584456c66921"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here if needed
    const notificationTitle = payload.notification ? payload.notification.title : 'Notificación';
    const notificationOptions = {
        body: payload.notification ? payload.notification.body : '',
        icon: '/logo192.png'
    };

    self.registration.showNotification(notificationTitle,
        notificationOptions);
});
