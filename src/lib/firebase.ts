
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
export let firebaseError: string | null = null; // Export for detailed error display

// Check for the existence of the API key
if (!firebaseConfig.apiKey) {
    firebaseError = "Firebase API key is missing. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is set in your .env.local file and that you have restarted the development server.";
} else {
    try {
        // Initialize Firebase only if it hasn't been initialized yet
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e: any) {
        // Catch potential errors during initialization (e.g., invalid config)
        firebaseError = `Firebase initialization failed: ${e.message}`;
    }
}


// A helper to check if firebase is initialized successfully
export function isFirebaseInitialized() {
    return !!app && !firebaseError;
}

export { app, auth, db };
