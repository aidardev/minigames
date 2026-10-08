import type { AppSessionProfile } from '@/services/session/session.types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { toProfile } from './user-profile';

/**
 * Must be started synchronously from a click handler: browsers block popups
 * that are opened after an await, so nothing async may run before this call.
 */
export async function signInWithGoogle(): Promise<AppSessionProfile> {
    const { user } = await signInWithPopup(auth, googleProvider);

    return toProfile(user);
}
