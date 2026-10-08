import type { AppSessionProfile } from '@/services/session/session.types';
import { getEmailLocalPart } from '@/utils/profile/profile';
import type { User } from 'firebase/auth';

/**
 * The only place that translates a Firebase user into the app's own profile,
 * so email and Google sign-in produce identical sessions.
 */
export function toProfile(user: User): AppSessionProfile {
    const email = user.email ?? '';

    return {
        displayName: user.displayName ?? getEmailLocalPart(email),
        email,
        ...(user.photoURL && { avatarUrl: user.photoURL }),
    };
}
