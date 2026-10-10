import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage, isAuthCancellation } from './auth-errors';

describe('getAuthErrorMessage', () => {
    it.each([
        ['auth/invalid-credential', 'Incorrect email or password.'],
        ['auth/user-not-found', 'Incorrect email or password.'],
        ['auth/wrong-password', 'Incorrect email or password.'],
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
    ])('maps %s to a readable message', (code, message) => {
        expect(getAuthErrorMessage(new FirebaseError(code, 'raw firebase text'))).toBe(message);
    });

    it('falls back to a generic message for unknown Firebase codes', () => {
        const error = new FirebaseError('auth/something-new', 'raw');

        expect(getAuthErrorMessage(error)).toBe('Something went wrong. Please try again.');
    });

    it('falls back to a generic message for non-Firebase errors', () => {
        expect(getAuthErrorMessage(new Error('boom'))).toBe(
            'Something went wrong. Please try again.',
        );
        expect(getAuthErrorMessage('boom')).toBe('Something went wrong. Please try again.');
    });
});

describe('isAuthCancellation', () => {
    it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
        'treats %s as a cancellation',
        (code) => {
            expect(isAuthCancellation(new FirebaseError(code, 'raw'))).toBe(true);
        },
    );

    it('does not treat real failures as a cancellation', () => {
        expect(isAuthCancellation(new FirebaseError('auth/popup-blocked', 'raw'))).toBe(false);
        expect(isAuthCancellation(new Error('boom'))).toBe(false);
    });
});
