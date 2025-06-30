
'use client';

import * as React from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, isFirebaseInitialized, firebaseError } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function FirebaseErrorDisplay() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-3xl shadow-lg">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Firebase Configuration Error</AlertTitle>
                <AlertDescription>
                    <p className="mb-2">The application could not connect to Firebase. This usually means your Firebase project credentials are missing or invalid.</p>
                    <p className="mb-4">Please ensure you have created a <strong>.env.local</strong> file in the root of your project with your Firebase configuration keys, as shown below.</p>
                    <pre className="p-3 rounded-md bg-muted text-muted-foreground text-xs overflow-x-auto">
                        {`NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="1:..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-..."`}
                    </pre>
                    <p className="mt-4 text-sm">
                        <strong>Specific Error:</strong>
                        <span className="ml-2 font-mono bg-muted px-1 py-0.5 rounded">{firebaseError}</span>
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // If Firebase isn't set up, or if auth failed to initialize, do nothing.
    if (!isFirebaseInitialized() || !auth) {
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // If firebase is not configured, show a helpful error message instead of crashing.
  if (!isFirebaseInitialized()) {
      return <FirebaseErrorDisplay />;
  }

  // This is the original loading state for when we are waiting for onAuthStateChanged
  if (loading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="w-1/2 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
