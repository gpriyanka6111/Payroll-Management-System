
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// We will export these, but they may be null if config is missing.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseError: string | null = null;

// Only initialize Firebase if the API key is provided
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e: any) {
        firebaseError = e.message;
        // The UI will handle displaying this error, so no need for a console log.
    }
} else {
    firebaseError = "Firebase configuration is missing. Please add your Firebase project keys to a .env.local file in the root of your project.";
    // The UI will handle displaying this error, so no need for a console log.
}


// A helper to check if firebase is initialized
export function isFirebaseInitialized() {
    return !!app;
}

export { app, auth, db, firebaseError };
