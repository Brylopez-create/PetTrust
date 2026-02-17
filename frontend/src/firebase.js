// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ... config ...
const firebaseConfig = {
    apiKey: "AIzaSyA0d0DMT2Jbbb-YzpTqKgBUXKkWO9nDXCE",
    authDomain: "pettrust-bogota.firebaseapp.com",
    projectId: "pettrust-bogota",
    storageBucket: "pettrust-bogota.firebasestorage.app",
    messagingSenderId: "16084338804",
    appId: "1:16084338804:web:6d06145e53584456c66921",
    measurementId: "G-3QG3ZXQ979"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const idToken = await user.getIdToken();
        return { user, idToken };
    } catch (error) {
        console.error("Error en Google Auth", error);
        throw error;
    }
};

// Request permission and get token
export const requestForToken = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const currentToken = await getToken(messaging, { vapidKey: 'BFmLSZwSoJkXhDDyuexu0SVjBfr9jycHs2PKqw0iHkwpgxsZ9mY1lBZIAlOh6omN81wo6HeJUNbmj9rkhExAqL8' });
            if (currentToken) {
                console.log('FCM Token received: ', currentToken);
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        } else {
            console.log('Permission not granted for Notification');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
    }
};


export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
