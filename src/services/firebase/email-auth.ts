import type { AppSessionProfile } from '@/services/session/session.types';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    type User,
} from 'firebase/auth';
import { auth } from './firebase';

export interface EmailCredentials {
    email: string;
    password: string;
}

export interface EmailRegistration extends EmailCredentials {
    username: string;
}

function toProfile(user: User, fallbackName: string): AppSessionProfile {
    const email = user.email ?? '';

    return {
        displayName: user.displayName ?? fallbackName,
        email,
        ...(user.photoURL && { avatarUrl: user.photoURL }),
    };
}

// Accounts created without a name still need something to show in the header.
function getNameFromEmail(email: string): string {
    return email.slice(0, email.indexOf('@'));
}

export async function signInWithEmail({
    email,
    password,
}: EmailCredentials): Promise<AppSessionProfile> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    return toProfile(user, getNameFromEmail(email));
}

export async function signUpWithEmail({
    username,
    email,
    password,
}: EmailRegistration): Promise<AppSessionProfile> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    try {
        await updateProfile(user, { displayName: username });
    } catch {
        // The account already exists, so a failed name update must not turn registration
        // into an error (a retry would fail with "email already in use"). The app session
        // below uses the typed username anyway.
    }

    return { ...toProfile(user, username), displayName: username };
}
