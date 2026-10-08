import { showSnackbar } from '@/components/snackbar/snackbar';
import { signInWithEmail, signUpWithEmail } from '@/services/firebase/email-auth';
import { appSession } from '@/services/session/app-session';
import { FirebaseError } from 'firebase/app';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleLogin, handleRegister } from './auth-flow';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({
    appSession: { createSession: vi.fn() },
}));
vi.mock('@/services/firebase/email-auth', () => ({
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
}));

const PROFILE = { displayName: 'Alex', email: 'alex@minigames.com' };
const LOGIN = { email: 'alex@minigames.com', password: 'secret1' };
const REGISTER = {
    username: 'Alex',
    email: 'alex@minigames.com',
    password: 'Abcde1!',
    confirmPassword: 'Abcde1!',
};

describe('handleLogin', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('starts the app session and greets the user on success', async () => {
        vi.mocked(signInWithEmail).mockResolvedValue(PROFILE);

        await expect(handleLogin(LOGIN)).resolves.toBe(true);

        expect(signInWithEmail).toHaveBeenCalledWith(LOGIN);
        expect(appSession.createSession).toHaveBeenCalledWith(PROFILE);
        expect(showSnackbar).toHaveBeenCalledWith('Welcome back, Alex!', 'success');
    });

    it('shows a readable error and creates no session on failure', async () => {
        vi.mocked(signInWithEmail).mockRejectedValue(
            new FirebaseError('auth/invalid-credential', 'raw'),
        );

        await expect(handleLogin(LOGIN)).resolves.toBe(false);

        expect(appSession.createSession).not.toHaveBeenCalled();
        expect(showSnackbar).toHaveBeenCalledWith('Incorrect email or password.', 'error');
    });
});

describe('handleRegister', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('starts the app session on success', async () => {
        vi.mocked(signUpWithEmail).mockResolvedValue(PROFILE);

        await expect(handleRegister(REGISTER)).resolves.toBe(true);

        expect(signUpWithEmail).toHaveBeenCalledWith(REGISTER);
        expect(appSession.createSession).toHaveBeenCalledWith(PROFILE);
        expect(showSnackbar).toHaveBeenCalledWith('Account created. Welcome, Alex!', 'success');
    });

    it('reports an already registered email', async () => {
        vi.mocked(signUpWithEmail).mockRejectedValue(
            new FirebaseError('auth/email-already-in-use', 'raw'),
        );

        await expect(handleRegister(REGISTER)).resolves.toBe(false);

        expect(appSession.createSession).not.toHaveBeenCalled();
        expect(showSnackbar).toHaveBeenCalledWith(
            'An account with this email already exists.',
            'error',
        );
    });

    it('falls back to a generic message for unexpected errors', async () => {
        vi.mocked(signUpWithEmail).mockRejectedValue(new Error('boom'));

        await expect(handleRegister(REGISTER)).resolves.toBe(false);

        expect(showSnackbar).toHaveBeenCalledWith(
            'Something went wrong. Please try again.',
            'error',
        );
    });
});
