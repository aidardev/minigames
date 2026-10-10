// @vitest-environment jsdom

import { showSnackbar } from '@/components/snackbar/snackbar';
import { appSession } from '@/services/session/app-session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogController } from './dialog-controller';
import { NAVIGATE_EVENT, openAuth } from './navigation';
import type { Route, Router } from './router';

const opened = vi.hoisted(() => ({ auth: 0, game: 0 }));

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({
    appSession: { getActiveSession: vi.fn() },
}));
vi.mock('./auth-flow', () => ({
    handleLogin: vi.fn(),
    handleRegister: vi.fn(),
    handleGoogleLogin: vi.fn(),
}));
vi.mock('@/components/dialogs/auth-dialog/auth-dialog', () => {
    class AuthDialog {
        public element = document.createElement('div');
        public close = vi.fn();
        public setTab = vi.fn();
        public open(): void {
            opened.auth += 1;
        }
    }

    return { AuthDialog, toAuthTab: (value: string | null): string => value ?? 'login' };
});
vi.mock('@/components/dialogs/game-details-dialog/game-details-dialog', () => {
    class GameDetailsDialog {
        public element = document.createElement('div');
        public close = vi.fn();
        public open(): void {
            opened.game += 1;
        }
    }

    return { GameDetailsDialog };
});

const noopListener = (): void => undefined;

function setup(): {
    router: Pick<Router, 'removeQuery' | 'removeQueryInPlace'>;
    go: (search: string) => void;
} {
    let listener: (route: Route) => void = noopListener;
    const router = {
        onRouteChange: vi.fn((next: (route: Route) => void): void => {
            listener = next;
        }),
        removeQuery: vi.fn(),
        removeQueryInPlace: vi.fn(),
    };

    new DialogController(router as unknown as Router).start();

    return {
        router,
        go: (search: string): void => listener({ path: '/', query: new URLSearchParams(search) }),
    };
}

describe('DialogController auth guard', () => {
    beforeEach(() => {
        opened.auth = 0;
        opened.game = 0;
        vi.resetAllMocks();
    });

    it('opens Auth from the URL for a guest', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go, router } = setup();

        go('?auth=login');

        expect(opened.auth).toBe(1);
        expect(router.removeQueryInPlace).not.toHaveBeenCalled();
        expect(showSnackbar).not.toHaveBeenCalled();
    });

    it('blocks Auth for an authenticated user, cleans only `auth` in place and notifies once', async () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue({
            displayName: 'A',
            email: 'a@b.c',
            authenticatedAt: Date.now(),
        });
        const { go, router } = setup();

        go('?auth=register');

        expect(opened.auth).toBe(0);
        expect(showSnackbar).toHaveBeenCalledOnce();
        // Deferred: the route change must finish before the URL is rewritten.
        expect(router.removeQueryInPlace).not.toHaveBeenCalled();

        await Promise.resolve();

        expect(router.removeQueryInPlace).toHaveBeenCalledExactlyOnceWith('auth');
    });

    it('keeps Game Details instead of opening Auth for an authenticated user', async () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue({
            displayName: 'A',
            email: 'a@b.c',
            authenticatedAt: Date.now(),
        });
        const { go, router } = setup();

        go('?game=cat-mail-co');
        go('?game=cat-mail-co&auth=login');
        await Promise.resolve();

        expect(opened.auth).toBe(0);
        expect(opened.game).toBe(1);
        expect(router.removeQueryInPlace).toHaveBeenCalledExactlyOnceWith('auth');
    });

    it('lets Auth replace Game Details for a guest', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go } = setup();

        go('?game=cat-mail-co&auth=login');

        expect(opened.auth).toBe(1);
        expect(opened.game).toBe(0);
    });

    it('restores Game Details when only `game` remains in the URL', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go } = setup();

        go('?game=cat-mail-co&auth=login');
        go('?game=cat-mail-co');

        expect(opened.game).toBe(1);
    });
});

describe('openAuth', () => {
    const onNavigate = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        addEventListener(NAVIGATE_EVENT, onNavigate);
    });

    afterEach(() => {
        removeEventListener(NAVIGATE_EVENT, onNavigate);
    });

    it('does not navigate for an authenticated user', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue({
            displayName: 'A',
            email: 'a@b.c',
            authenticatedAt: Date.now(),
        });
        setup();

        openAuth('login');

        expect(onNavigate).not.toHaveBeenCalled();
        expect(showSnackbar).toHaveBeenCalledOnce();
    });

    it('navigates for a guest', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        setup();

        openAuth('login');

        expect(onNavigate).toHaveBeenCalledOnce();
    });
});
