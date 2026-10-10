import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

function createGoogleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    // Without it Google silently reuses the last account
    provider.setCustomParameters({ prompt: 'select_account' });

    return provider;
}

export const googleProvider = createGoogleProvider();

export function signOutFirebaseUser(): Promise<void> {
    return signOut(auth);
}
