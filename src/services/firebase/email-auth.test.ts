import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    type UserCredential,
} from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signInWithEmail, signUpWithEmail } from './email-auth';
import { auth } from './firebase';

vi.mock('./firebase', () => ({ auth: { name: 'auth' } }));
vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
}));

// Firebase declares these fields as string | null, but unicorn/no-null forbids writing null.
interface FakeUser {
    displayName?: string;
    email?: string;
    photoURL?: string;
}

function credentialFor(user: FakeUser): UserCredential {
    return { user } as unknown as UserCredential;
}
const EMAIL = 'alex@minigames.com';
const PASSWORD = 'Abcde1!';

describe('signInWithEmail', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('signs in with the given credentials and maps the user to a profile', async () => {
        vi.mocked(signInWithEmailAndPassword).mockResolvedValue(
            credentialFor({
                displayName: 'Alex',
                email: EMAIL,
                photoURL: 'https://example.com/a.png',
            }),
        );

        const profile = await signInWithEmail({ email: EMAIL, password: PASSWORD });

        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, EMAIL, PASSWORD);
        expect(profile).toStrictEqual({
            displayName: 'Alex',
            email: EMAIL,
            avatarUrl: 'https://example.com/a.png',
        });
    });

    it('uses the part of the email before "@" when the account has no name', async () => {
        vi.mocked(signInWithEmailAndPassword).mockResolvedValue(credentialFor({ email: EMAIL }));

        const profile = await signInWithEmail({ email: EMAIL, password: PASSWORD });

        expect(profile).toStrictEqual({ displayName: 'alex', email: EMAIL });
    });

    it('lets Firebase errors through', async () => {
        const error = new Error('denied');
        vi.mocked(signInWithEmailAndPassword).mockRejectedValue(error);

        await expect(signInWithEmail({ email: EMAIL, password: PASSWORD })).rejects.toBe(error);
    });
});

describe('signUpWithEmail', () => {
    const registration = { username: 'Alex99', email: EMAIL, password: PASSWORD };
    const created = credentialFor({ email: EMAIL });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('creates the account and saves the username as displayName', async () => {
        vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(created);

        const profile = await signUpWithEmail(registration);

        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, EMAIL, PASSWORD);
        expect(updateProfile).toHaveBeenCalledWith(created.user, { displayName: 'Alex99' });
        expect(profile).toStrictEqual({ displayName: 'Alex99', email: EMAIL });
    });

    it('still succeeds when saving the name fails, because the account already exists', async () => {
        vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(created);
        vi.mocked(updateProfile).mockRejectedValue(new Error('network'));

        await expect(signUpWithEmail(registration)).resolves.toStrictEqual({
            displayName: 'Alex99',
            email: EMAIL,
        });
    });

    it('does not touch the profile when the account was not created', async () => {
        const error = new Error('exists');
        vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(error);

        await expect(signUpWithEmail(registration)).rejects.toBe(error);
        expect(updateProfile).not.toHaveBeenCalled();
    });
});
