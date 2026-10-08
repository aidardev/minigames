import { AuthDialog, toAuthTab } from '@/components/dialogs/auth-dialog/auth-dialog';
import type { Dialog } from '@/components/dialogs/dialog';
import { GameDetailsDialog } from '@/components/dialogs/game-details-dialog/game-details-dialog';
import { handleLogin, handleRegister } from './auth-flow';
import { setQueryParameter } from './navigation';
import type { Route, Router } from './router';

const GAME_PARAM = 'game';
const AUTH_PARAM = 'auth';

interface OpenDialog {
    // What is open, e.g. "game:cat-mail-co" or "auth"; equal keys mean "nothing to do".
    key: string;
    dialog: Dialog;
    // The query param that opened it, removed from the URL when the user closes the dialog.
    param: string;
    // The URL still points at this dialog but other params changed (e.g. the auth tab).
    update?: (query: URLSearchParams) => void;
}

type DialogFactory = () => Omit<OpenDialog, 'key'>;

/**
Keeps at most one dialog open, driven entirely by the URL.
*/
export class DialogController {
    private readonly router: Router;
    private current: OpenDialog | undefined;

    constructor(router: Router) {
        this.router = router;
    }

    private sync(query: URLSearchParams): void {
        const slug = query.get(GAME_PARAM);
        const auth = query.get(AUTH_PARAM);

        // One dialog at a time; if a hand-written URL has both params, the game wins.
        if (slug) {
            this.show(`game:${slug}`, query, (): Omit<OpenDialog, 'key'> => ({
                param: GAME_PARAM,
                dialog: new GameDetailsDialog({ slug }),
            }));
        } else if (auth) {
            this.show('auth', query, (): Omit<OpenDialog, 'key'> => this.createAuth(query));
        } else {
            this.closeCurrent();
        }
    }

    private createAuth(query: URLSearchParams): Omit<OpenDialog, 'key'> {
        const dialog = new AuthDialog({
            initialTab: toAuthTab(query.get(AUTH_PARAM)),
            // Switching tabs rewrites the URL but must not add a history entry.
            onTabChange: (tab): void => setQueryParameter(AUTH_PARAM, tab, { replace: true }),
            onLogin: (values): Promise<void> => this.finishAuth(handleLogin(values)),
            onRegister: (values): Promise<void> => this.finishAuth(handleRegister(values)),
        });

        return {
            param: AUTH_PARAM,
            dialog,
            update: (next: URLSearchParams): void => dialog.setTab(toAuthTab(next.get(AUTH_PARAM))),
        };
    }

    private show(key: string, query: URLSearchParams, create: DialogFactory): void {
        if (this.current?.key === key) {
            this.current.update?.(query);
            return;
        }

        this.closeCurrent();
        this.open({ key, ...create() });
    }

    private open(entry: OpenDialog): void {
        this.current = entry;
        entry.dialog.element.addEventListener('close', (): void => this.handleClosed(entry));
        entry.dialog.open();
    }

    private closeCurrent(): void {
        const entry = this.current;
        if (!entry) return;

        // Cleared first: the dialog's own "close" event must be recognized as programmatic.
        this.current = undefined;
        entry.dialog.close();
    }

    private handleClosed(entry: OpenDialog): void {
        // Closed by the controller because the URL changed: the URL is already correct.
        if (this.current !== entry) return;

        // Closed by the user (Escape, backdrop, close button): reflect it in the URL.
        this.current = undefined;
        this.router.removeQuery(entry.param);
    }

    // Success closes the dialog the same way the URL does: by dropping the auth param.
    private async finishAuth(attempt: Promise<boolean>): Promise<void> {
        if (await attempt) this.router.removeQuery(AUTH_PARAM);
    }

    // Must be called before router.start(), so a deep link opens its dialog on the first render.
    public start(): void {
        this.router.onRouteChange((route: Route): void => this.sync(route.query));
    }
}
