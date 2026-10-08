import { FirebaseError } from 'firebase/app';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
const INVALID_CREDENTIALS = 'Incorrect email or password.';

// With Email Enumeration Protection (on by default) Firebase answers "invalid-credential"
// for both an unknown email and a wrong password; the other two codes are legacy.
const AUTH_ERROR_MESSAGES = new Map<string, string>([
    ['auth/invalid-credential', INVALID_CREDENTIALS],
    ['auth/user-not-found', INVALID_CREDENTIALS],
    ['auth/wrong-password', INVALID_CREDENTIALS],
    ['auth/email-already-in-use', 'An account with this email already exists.'],
    ['auth/too-many-requests', 'Too many attempts. Please try again later.'],
    ['auth/network-request-failed', 'Network error. Check your connection and try again.'],
    ['auth/user-disabled', 'This account has been disabled.'],
    [
        'auth/popup-blocked',
        'The sign-in window was blocked by your browser. Allow pop-ups and try again.',
    ],
    [
        'auth/account-exists-with-different-credential',
        'An account with this email already exists with a different sign-in method.',
    ],
]);

// The user closed the Google window on purpose: not a failure worth an error message.
const CANCELLATION_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function getAuthErrorMessage(error: unknown): string {
    if (!(error instanceof FirebaseError)) return DEFAULT_MESSAGE;

    return AUTH_ERROR_MESSAGES.get(error.code) ?? DEFAULT_MESSAGE;
}

export function isAuthCancellation(error: unknown): boolean {
    return error instanceof FirebaseError && CANCELLATION_CODES.has(error.code);
}
