import type { AppSessionProfile } from '@/services/session/session.types';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { toProfile } from './user-profile';

export interface EmailCredentials {
    email: string;
    password: string;
}

export interface EmailRegistration extends EmailCredentials {
    username: string;
}

export async function signInWithEmail({
    email,
    password,
}: EmailCredentials): Promise<AppSessionProfile> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    return toProfile(user);
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

    return { ...toProfile(user), displayName: username };
}
