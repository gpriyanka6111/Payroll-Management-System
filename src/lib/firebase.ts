// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// We will export these, but they may be null if config is missing.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
export let firebaseError: string | null = null; // Export for detailed error display

// Define required keys for a robust check
const requiredKeys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingKeys = requiredKeys.filter(key => !process.env[key]);

if (missingKeys.length > 0) {
    firebaseError = `Firebase Initialization Error: The application server cannot find the required Firebase keys.

This usually means the .env.local file is not being loaded correctly. Please double-check the following:

1.  **File Name & Location**: 
    Ensure there is a file named exactly '.env.local' in the absolute root directory of your project (at the same level as package.json).

2.  **Server Restart**: 
    You MUST restart the development server after creating or changing the .env.local file.

3.  **File Contents**: 
    The file should contain plain text like: NEXT_PUBLIC_FIREBASE_API_KEY="your-key"

The following keys were reported as missing by the server process:
- ${missingKeys.join('\n- ')}
`;
} else {
    // All keys are present, now build the config and initialize
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
    };
    
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (e: any) {
        firebaseError = `Firebase initialization failed: ${e.message}`;
    }
}


// A helper to check if firebase is initialized successfully
export function isFirebaseInitialized() {
    return !!app && !firebaseError;
}

export { app, auth, db };
