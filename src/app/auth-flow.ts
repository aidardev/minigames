import type { LoginValues, RegisterValues } from '@/components/dialogs/auth-dialog/auth-validation';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { getAuthErrorMessage, isAuthCancellation } from '@/services/firebase/auth-errors';
import { signInWithEmail, signUpWithEmail } from '@/services/firebase/email-auth';
import { signInWithGoogle } from '@/services/firebase/google-auth';
import { appSession } from '@/services/session/app-session';
import type { AppSessionProfile } from '@/services/session/session.types';

/**
 * Runs a Firebase sign-in or registration. On success starts the app session,
 * on failure shows the error. Never throws; resolves to whether it succeeded.
 */
async function canAuthenticate(
    signIn: () => Promise<AppSessionProfile>,
    getSuccessMessage: (profile: AppSessionProfile) => string,
): Promise<boolean> {
    let profile: AppSessionProfile;

    try {
        profile = await signIn();
    } catch (error) {
        if (isAuthCancellation(error)) {
            showSnackbar('Sign-in was cancelled.', 'info');
        } else {
            showSnackbar(getAuthErrorMessage(error), 'error');
        }
        return false;
    }

    appSession.createSession(profile);
    showSnackbar(getSuccessMessage(profile), 'success');

    return true;
}

export function handleLogin(values: Readonly<LoginValues>): Promise<boolean> {
    return canAuthenticate(
        () => signInWithEmail(values),
        ({ displayName }): string => `Welcome back, ${displayName}!`,
    );
}

export function handleRegister(values: Readonly<RegisterValues>): Promise<boolean> {
    return canAuthenticate(
        () => signUpWithEmail(values),
        ({ displayName }): string => `Account created. Welcome, ${displayName}!`,
    );
}

export function handleGoogleLogin(): Promise<boolean> {
    return canAuthenticate(
        signInWithGoogle,
        ({ displayName }): string => `Welcome, ${displayName}!`,
    );
}
