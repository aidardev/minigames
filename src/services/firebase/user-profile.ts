import type { AppSessionProfile } from '@/services/session/session.types';
import type { User } from 'firebase/auth';

function getNameFromEmail(email: string): string {
    return email.slice(0, email.indexOf('@'));
}

/**
 * The only place that translates a Firebase user into the app's own profile,
 * so email and Google sign-in produce identical sessions.
 */
export function toProfile(user: User): AppSessionProfile {
    const email = user.email ?? '';

    return {
        displayName: user.displayName ?? getNameFromEmail(email),
        email,
        ...(user.photoURL && { avatarUrl: user.photoURL }),
    };
}
