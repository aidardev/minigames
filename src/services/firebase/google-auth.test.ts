import { signInWithPopup, type UserCredential } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth, googleProvider } from './firebase';
import { signInWithGoogle } from './google-auth';

vi.mock('./firebase', () => ({
    auth: { name: 'auth' },
    googleProvider: { name: 'google' },
}));
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn() }));

interface FakeUser {
    displayName?: string;
    email?: string;
    photoURL?: string;
}

function credentialFor(user: FakeUser): UserCredential {
    return { user } as unknown as UserCredential;
}

describe('signInWithGoogle', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('opens the Google popup of the app and maps the user to a profile', async () => {
        vi.mocked(signInWithPopup).mockResolvedValue(
            credentialFor({
                displayName: 'Alex Doe',
                email: 'alex@gmail.com',
                photoURL: 'https://example.com/a.png',
            }),
        );

        const profile = await signInWithGoogle();

        expect(signInWithPopup).toHaveBeenCalledWith(auth, googleProvider);
        expect(profile).toStrictEqual({
            displayName: 'Alex Doe',
            email: 'alex@gmail.com',
            avatarUrl: 'https://example.com/a.png',
        });
    });

    it('omits avatarUrl when the account has no photo', async () => {
        vi.mocked(signInWithPopup).mockResolvedValue(
            credentialFor({ displayName: 'Alex', email: 'alex@gmail.com' }),
        );

        await expect(signInWithGoogle()).resolves.toStrictEqual({
            displayName: 'Alex',
            email: 'alex@gmail.com',
        });
    });

    it('lets Firebase errors through', async () => {
        const error = new Error('closed');
        vi.mocked(signInWithPopup).mockRejectedValue(error);

        await expect(signInWithGoogle()).rejects.toBe(error);
    });
});
