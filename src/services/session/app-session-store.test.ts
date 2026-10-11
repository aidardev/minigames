// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
    APP_SESSION_LIFETIME_MS,
    APP_SESSION_STORAGE_KEY,
    AppSessionStore,
} from './app-session-store';
import type { AppSession } from './session.types';

const START_TIME = new Date('2026-01-01T12:00:00Z').getTime();
const PROFILE = { displayName: 'Forest Dweller', email: 'student@rs.school' };

interface TestContext {
    store: AppSessionStore;
    signOut: Mock<() => Promise<void>>;
    onExpired: Mock<() => void>;
}

function setup(): TestContext {
    const signOut = vi.fn<() => Promise<void>>().mockResolvedValue();
    const onExpired = vi.fn<() => void>();
    const store = new AppSessionStore({ signOut, onExpired });

    return { store, signOut, onExpired };
}

function storeRaw(value: unknown): void {
    localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(value));
}

describe('AppSessionStore', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(START_TIME);
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('createSession', () => {
        it('saves only profile fields and the login time', () => {
            const { store } = setup();

            store.createSession(PROFILE);

            expect(JSON.parse(localStorage.getItem(APP_SESSION_STORAGE_KEY) ?? '')).toStrictEqual({
                ...PROFILE,
                authenticatedAt: START_TIME,
            });
        });

        it('saves avatarUrl when it is available', () => {
            const { store } = setup();

            store.createSession({ ...PROFILE, avatarUrl: 'https://example.com/a.png' });

            expect(store.getActiveSession()?.avatarUrl).toBe('https://example.com/a.png');
        });

        it('does not save an empty avatarUrl', () => {
            const { store } = setup();

            store.createSession({ ...PROFILE, avatarUrl: '' });

            expect(store.getActiveSession()).not.toHaveProperty('avatarUrl');
        });
    });

    describe('subscribe', () => {
        it('reports the current state immediately and every change after', async () => {
            const { store } = setup();
            const observed: (AppSession | undefined)[] = [];

            store.subscribe((session): void => {
                observed.push(session);
            });
            store.createSession(PROFILE);
            await store.logout();

            expect(observed).toStrictEqual([
                undefined,
                { ...PROFILE, authenticatedAt: START_TIME },
                undefined,
            ]);
        });

        it('stops notifying after unsubscribe', () => {
            const { store } = setup();
            const listener = vi.fn();

            const unsubscribe = store.subscribe(listener);
            unsubscribe();
            store.createSession(PROFILE);

            expect(listener).toHaveBeenCalledOnce();
        });
    });

    describe('start (restore)', () => {
        it('stays in Guest Mode when nothing is stored', () => {
            const { store, signOut } = setup();

            store.start();

            expect(store.getActiveSession()).toBeUndefined();
            expect(signOut).not.toHaveBeenCalled();
        });

        it('restores a valid session without extending its lifetime', () => {
            const stored = { ...PROFILE, authenticatedAt: START_TIME - 60_000 };
            storeRaw(stored);
            const { store } = setup();

            store.start();

            expect(store.getActiveSession()).toStrictEqual(stored);
            expect(JSON.parse(localStorage.getItem(APP_SESSION_STORAGE_KEY) ?? '')).toStrictEqual(
                stored,
            );
        });

        it('expires a restored session at the original deadline, not 5 minutes after reload', () => {
            storeRaw({ ...PROFILE, authenticatedAt: START_TIME - 60_000 });
            const { store, onExpired } = setup();

            store.start();
            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS - 60_000 - 1);
            expect(store.getActiveSession()).toBeDefined();

            vi.advanceTimersByTime(1);
            expect(store.getActiveSession()).toBeUndefined();
            expect(onExpired).toHaveBeenCalledOnce();
        });

        it('expires an already outdated session with a single notification', () => {
            storeRaw({ ...PROFILE, authenticatedAt: START_TIME - APP_SESSION_LIFETIME_MS });
            const { store, signOut, onExpired } = setup();

            store.start();

            expect(store.getActiveSession()).toBeUndefined();
            expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).toHaveBeenCalledOnce();
        });

        it.each([
            ['broken JSON', '{broken'],
            ['not an object', '42'],
            ['null', 'null'],
            ['missing email', JSON.stringify({ displayName: 'A', authenticatedAt: START_TIME })],
            [
                'authenticatedAt is a string',
                JSON.stringify({ ...PROFILE, authenticatedAt: 'yesterday' }),
            ],
            [
                'avatarUrl is a number',
                JSON.stringify({ ...PROFILE, authenticatedAt: START_TIME, avatarUrl: 5 }),
            ],
            [
                'authenticatedAt is in the future',
                JSON.stringify({ ...PROFILE, authenticatedAt: START_TIME + 1 }),
            ],
        ])('falls back to Guest Mode on invalid data: %s', (_case, raw) => {
            localStorage.setItem(APP_SESSION_STORAGE_KEY, raw);
            localStorage.setItem('unrelated-key', 'keep-me');
            const { store, signOut, onExpired } = setup();

            store.start();

            expect(store.getActiveSession()).toBeUndefined();
            expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
            expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).not.toHaveBeenCalled();
        });
    });

    describe('expiration', () => {
        it('switches to Guest Mode exactly when the 5 minutes pass', () => {
            const { store, signOut, onExpired } = setup();
            store.createSession(PROFILE);

            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS - 1);
            expect(store.getActiveSession()).toBeDefined();

            vi.advanceTimersByTime(1);
            expect(store.getActiveSession()).toBeUndefined();
            expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).toHaveBeenCalledOnce();
        });

        it('notifies subscribers when the session expires', () => {
            const { store } = setup();
            const listener = vi.fn();
            store.createSession(PROFILE);
            store.subscribe(listener);

            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS);

            expect(listener).toHaveBeenLastCalledWith(undefined);
        });

        it('catches an expired session whose timer was delayed (sleeping tab)', () => {
            const { store, onExpired } = setup();
            store.createSession(PROFILE);

            // The clock moves forward but timers do not fire, like in a frozen background tab.
            vi.setSystemTime(START_TIME + APP_SESSION_LIFETIME_MS);

            expect(store.checkExpiration()).toBe(true);
            expect(store.checkExpiration()).toBe(false);
            expect(onExpired).toHaveBeenCalledOnce();
        });

        it('getActiveSession never returns an expired session', () => {
            const { store } = setup();
            store.createSession(PROFILE);

            vi.setSystemTime(START_TIME + APP_SESSION_LIFETIME_MS);

            expect(store.getActiveSession()).toBeUndefined();
        });

        it('starts a fresh lifetime on a new login', () => {
            const { store, onExpired } = setup();
            store.createSession(PROFILE);
            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS - 1000);

            store.createSession(PROFILE);
            vi.advanceTimersByTime(2000);

            expect(store.getActiveSession()).toBeDefined();
            expect(onExpired).not.toHaveBeenCalled();
        });

        it('expires when authenticatedAt is edited in storage without a reload', () => {
            const { store, signOut, onExpired } = setup();
            store.createSession(PROFILE);

            storeRaw({ ...PROFILE, authenticatedAt: START_TIME - APP_SESSION_LIFETIME_MS });

            expect(store.getActiveSession()).toBeUndefined();
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).toHaveBeenCalledOnce();
        });

        it('falls back to Guest Mode when the key is removed from storage', () => {
            const { store, signOut, onExpired } = setup();
            store.createSession(PROFILE);

            localStorage.removeItem(APP_SESSION_STORAGE_KEY);

            expect(store.getActiveSession()).toBeUndefined();
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).not.toHaveBeenCalled();
        });

        it('falls back to Guest Mode when the stored value is corrupted', () => {
            const { store, signOut } = setup();
            store.createSession(PROFILE);

            localStorage.setItem(APP_SESSION_STORAGE_KEY, '{broken');

            expect(store.getActiveSession()).toBeUndefined();
            expect(signOut).toHaveBeenCalledOnce();
        });

        it('follows an edited but still valid timestamp', () => {
            const { store, onExpired } = setup();
            store.createSession(PROFILE);
            const editedAt = START_TIME - 60_000;

            storeRaw({ ...PROFILE, authenticatedAt: editedAt });
            store.checkExpiration();
            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS - 60_000);

            expect(onExpired).toHaveBeenCalledOnce();
        });
    });

    describe('page activity checks', () => {
        it('checks the session when the window gets focus', () => {
            const { store } = setup();
            store.start();
            store.createSession(PROFILE);
            vi.setSystemTime(START_TIME + APP_SESSION_LIFETIME_MS);

            dispatchEvent(new Event('focus'));

            expect(store.getActiveSession()).toBeUndefined();
        });

        it('checks the session when the tab becomes visible', () => {
            vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
            const { store, onExpired } = setup();
            store.start();
            store.createSession(PROFILE);
            vi.setSystemTime(START_TIME + APP_SESSION_LIFETIME_MS);

            document.dispatchEvent(new Event('visibilitychange'));

            expect(onExpired).toHaveBeenCalledOnce();
        });
    });

    describe('logout', () => {
        it('clears the session without an expiration notice', async () => {
            const { store, signOut, onExpired } = setup();
            store.createSession(PROFILE);

            await store.logout();

            expect(store.getActiveSession()).toBeUndefined();
            expect(localStorage.getItem(APP_SESSION_STORAGE_KEY)).toBeNull();
            expect(signOut).toHaveBeenCalledOnce();
            expect(onExpired).not.toHaveBeenCalled();
        });

        it('cancels the expiration timer', async () => {
            const { store, onExpired } = setup();
            store.createSession(PROFILE);

            await store.logout();
            vi.advanceTimersByTime(APP_SESSION_LIFETIME_MS);

            expect(onExpired).not.toHaveBeenCalled();
        });

        it('still reaches Guest Mode when Firebase sign-out fails', async () => {
            const { store, signOut } = setup();
            signOut.mockRejectedValue(new Error('network'));
            store.createSession(PROFILE);

            await store.logout();
            await vi.advanceTimersByTimeAsync(0);

            expect(store.getActiveSession()).toBeUndefined();
        });
    });
});
