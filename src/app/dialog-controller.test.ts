// @vitest-environment jsdom

import type { AuthDialogOptions } from '@/components/dialogs/auth-dialog/auth-dialog';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { appSession } from '@/services/session/app-session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGoogleLogin, handleLogin, handleRegister } from './auth-flow';
import { DialogController } from './dialog-controller';
import { NAVIGATE_EVENT, openAuth, setAuthGuard } from './navigation';
import type { Route, Router } from './router';

const opened = vi.hoisted(() => ({
    auth: 0,
    game: 0,
    authElement: undefined as HTMLElement | undefined,
    authOptions: undefined as AuthDialogOptions | undefined,
    authSetTab: undefined as ReturnType<typeof vi.fn> | undefined,
    authClose: undefined as ReturnType<typeof vi.fn> | undefined,
    gameClose: undefined as ReturnType<typeof vi.fn> | undefined,
    gameElement: undefined as HTMLElement | undefined,
}));

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
        public close = vi.fn((): void => {
            this.element.dispatchEvent(new Event('close'));
        });
        public setTab = vi.fn();

        constructor(options: AuthDialogOptions) {
            opened.authElement = this.element;
            opened.authOptions = options;
            opened.authSetTab = this.setTab;
            opened.authClose = this.close;
        }

        public open(): void {
            opened.auth += 1;
        }
    }

    return { AuthDialog, toAuthTab: (value: string | null): string => value ?? 'login' };
});
vi.mock('@/components/dialogs/game-details-dialog/game-details-dialog', () => {
    class GameDetailsDialog {
        public element = document.createElement('div');
        public close = vi.fn((): void => {
            this.element.dispatchEvent(new Event('close'));
        });

        constructor() {
            opened.gameClose = this.close;
            opened.gameElement = this.element;
        }
        public open(): void {
            opened.game += 1;
        }
    }

    return { GameDetailsDialog };
});

const noopListener = (): void => undefined;

afterEach(() => {
    setAuthGuard((): boolean => false);
});

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
        opened.authElement = undefined;
        opened.authOptions = undefined;
        opened.authSetTab = undefined;
        opened.authClose = undefined;
        opened.gameClose = undefined;
        opened.gameElement = undefined;
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
            uid: 'user-1',
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
            uid: 'user-1',
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
        const { go, router } = setup();

        go('?game=cat-mail-co');
        go('?game=cat-mail-co&auth=login');

        expect(opened.auth).toBe(1);
        expect(opened.game).toBe(1);
        expect(opened.gameClose).toHaveBeenCalledOnce();
        expect(router.removeQuery).not.toHaveBeenCalled();
    });

    it('restores Game Details when only `game` remains in the URL', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go, router } = setup();

        go('?game=cat-mail-co&auth=login');
        go('?game=cat-mail-co');

        expect(opened.game).toBe(1);
        expect(opened.authClose).toHaveBeenCalledOnce();
        expect(router.removeQuery).not.toHaveBeenCalled();
    });

    it('updates the open Auth dialog when its tab changes in the URL', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go } = setup();

        go('?auth=login');
        go('?auth=register');

        expect(opened.auth).toBe(1);
        expect(opened.authSetTab).toHaveBeenCalledExactlyOnceWith('register');
    });

    it('removes the Auth query when the user closes the dialog', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go, router } = setup();

        go('?auth=login');
        opened.authElement?.dispatchEvent(new Event('close'));

        expect(router.removeQuery).toHaveBeenCalledExactlyOnceWith('auth');
    });

    it('removes Auth after a successful login', async () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);
        const { go, router } = setup();
        go('?auth=login');

        vi.mocked(handleLogin).mockResolvedValue(true);
        await opened.authOptions?.onLogin?.({ email: 'a@b.c', password: 'secret1' });

        expect(router.removeQuery).toHaveBeenCalledExactlyOnceWith('auth');
        expect(handleLogin).toHaveBeenCalledExactlyOnceWith({
            email: 'a@b.c',
            password: 'secret1',
        });
    });

    it('keeps Auth open after a failed login', async () => {
        const { go, router } = setup();
        go('?auth=login');
        vi.mocked(handleLogin).mockResolvedValue(false);
        await opened.authOptions?.onLogin?.({ email: 'a@b.c', password: 'secret1' });

        expect(router.removeQuery).not.toHaveBeenCalled();
        expect(opened.authClose).not.toHaveBeenCalled();
    });

    it.each([true, false])('handles registration with success=%s', async (success) => {
        const { go, router } = setup();
        go('?auth=register');
        const values = {
            username: 'Alex',
            email: 'a@b.c',
            password: 'Abcde1!',
            confirmPassword: 'Abcde1!',
        };
        vi.mocked(handleRegister).mockResolvedValue(success);

        await opened.authOptions?.onRegister?.(values);

        expect(handleRegister).toHaveBeenCalledExactlyOnceWith(values);
        if (success) expect(router.removeQuery).toHaveBeenCalledExactlyOnceWith('auth');
        else expect(router.removeQuery).not.toHaveBeenCalled();
    });

    it.each([true, false])('handles Google login with success=%s', async (success) => {
        const { go, router } = setup();
        go('?auth=login');
        vi.mocked(handleGoogleLogin).mockResolvedValue(success);

        await opened.authOptions?.onGoogleLogin?.();

        expect(handleGoogleLogin).toHaveBeenCalledExactlyOnceWith();
        if (success) expect(router.removeQuery).toHaveBeenCalledExactlyOnceWith('auth');
        else expect(router.removeQuery).not.toHaveBeenCalled();
    });

    it('replaces the Auth tab in the URL while preserving the game query', () => {
        history.replaceState(undefined, '', '/library?game=cat-mail-co&auth=login');
        const onNavigate = vi.fn();
        addEventListener(NAVIGATE_EVENT, onNavigate);
        try {
            const { go } = setup();
            go(location.search);

            opened.authOptions?.onTabChange?.('register');

            expect(onNavigate).toHaveBeenCalledOnce();
            expect(onNavigate.mock.calls[0]?.[0].detail).toEqual({
                to: '/library?game=cat-mail-co&auth=register',
                options: { replace: true },
            });
        } finally {
            removeEventListener(NAVIGATE_EVENT, onNavigate);
        }
    });

    it('closes the current dialog when its query is removed without rewriting the URL', () => {
        const { go, router } = setup();
        go('?auth=login');

        go('');

        expect(opened.authClose).toHaveBeenCalledOnce();
        expect(router.removeQuery).not.toHaveBeenCalled();
    });

    it('removes only the game query when the user closes Game Details', () => {
        const { go, router } = setup();
        go('?game=cat-mail-co');

        opened.gameElement?.dispatchEvent(new Event('close'));

        expect(router.removeQuery).toHaveBeenCalledExactlyOnceWith('game');
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
            uid: 'user-1',
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
