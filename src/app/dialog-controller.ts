import { AuthDialog, toAuthTab } from '@/components/dialogs/auth-dialog/auth-dialog';
import { CollectionDialog } from '@/components/dialogs/collection-dialog/collection-dialog';
import type { Dialog } from '@/components/dialogs/dialog';
import { GameDetailsDialog } from '@/components/dialogs/game-details-dialog/game-details-dialog';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { listItems } from '@/services/collections/collections-repo';
import { collectionsStore } from '@/services/collections/collections-store';
import { appSession } from '@/services/session/app-session';
import type { Collection } from '@/types/collection.types';
import { handleGoogleLogin, handleLogin, handleRegister } from './auth-flow';
import {
    AUTH_PARAM,
    COLLECTION_PICKER_PARAM,
    CREATE_COLLECTION_PARAM,
    EDIT_COLLECTION_PARAM,
    GAME_PARAM,
    setAuthGuard,
    setQueryParameter,
} from './navigation';
import { requireSession } from './require-auth';
import type { Route, Router } from './router';

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
Owns the primary dialog selected by the URL. Local confirmations belong to their editor.
*/
export class DialogController {
    private readonly router: Router;
    private current: OpenDialog | undefined;
    private query = new URLSearchParams();
    private collectionOwner: string | undefined;
    private route: Route | undefined;

    constructor(router: Router) {
        this.router = router;
    }

    private sync(query: URLSearchParams): void {
        this.query = query;
        if (!query.has(CREATE_COLLECTION_PARAM) && !query.has(EDIT_COLLECTION_PARAM)) {
            this.collectionOwner = undefined;
        }
        const slug = query.get(GAME_PARAM);
        const auth = query.get(AUTH_PARAM);
        const collectionId = query.get(EDIT_COLLECTION_PARAM);

        // One dialog at a time. Auth wins over a game: it replaces Game Details after a
        // protected action, and closing it drops only auth, which brings the game back.
        if (auth) {
            if (this.isAuthBlocked()) {
                this.scheduleAuthCleanup();
                return;
            }

            this.show('auth', query, (): Omit<OpenDialog, 'key'> => this.createAuth(query));
        } else if (collectionId) {
            const uid = this.collectionUser(query, EDIT_COLLECTION_PARAM);
            if (uid) this.showEditCollection(uid, collectionId, query);
        } else if (query.get(CREATE_COLLECTION_PARAM) === 'true') {
            const uid = this.collectionUser(query, CREATE_COLLECTION_PARAM);
            if (uid) {
                this.show(`create-collection:${uid}`, query, (): Omit<OpenDialog, 'key'> =>
                    this.createCollectionDialog(uid),
                );
            }
        } else if (slug) {
            this.show(`game:${slug}`, query, (): Omit<OpenDialog, 'key'> => {
                const dialog = new GameDetailsDialog({
                    slug,
                    isCollectionPickerOpen: query.get(COLLECTION_PICKER_PARAM) === 'true',
                });
                return {
                    param: GAME_PARAM,
                    dialog,
                    update: (next): void =>
                        dialog.setCollectionPickerOpen(
                            next.get(COLLECTION_PICKER_PARAM) === 'true',
                        ),
                };
            });
        } else {
            this.closeCurrent();
        }
    }

    private collectionUser(query: URLSearchParams, parameter: string): string | undefined {
        const session = appSession.getActiveSession();
        if (session) {
            this.collectionOwner = session.uid;
            return session.uid;
        }

        this.closeCurrent();
        this.collectionOwner = undefined;
        queueMicrotask((): void => {
            if (this.query !== query) return;
            this.router.removeQueryInPlace(parameter);
            const action = parameter === EDIT_COLLECTION_PARAM ? 'edit' : 'create';
            requireSession(`Sign in to ${action} a collection.`);
        });
        return undefined;
    }

    private showEditCollection(uid: string, id: string, query: URLSearchParams): void {
        const key = `edit-collection:${uid}:${id}`;
        if (this.current?.key === key) return;

        const state = collectionsStore.getState();
        if (state.uid !== uid || state.collections === undefined) {
            this.closeCurrent();
            return;
        }
        const collection = state.collections.find((item) => item.id === id);
        if (collection) {
            this.show(key, query, (): Omit<OpenDialog, 'key'> =>
                this.createEditCollectionDialog(uid, collection),
            );
            return;
        }

        this.closeCurrent();
        if (state.status !== 'ready') return;
        showSnackbar('This collection was not found or is no longer available.', 'error');
        queueMicrotask((): void => {
            if (this.query === query) this.router.removeQueryInPlace(EDIT_COLLECTION_PARAM);
        });
    }

    private canManageCollection(dialog: Dialog, uid: string): boolean {
        if (this.current?.dialog !== dialog) return false;
        return requireSession('Sign in to manage your collections.')?.uid === uid;
    }

    private createCollectionDialog(uid: string): Omit<OpenDialog, 'key'> {
        const dialog = new CollectionDialog({
            mode: 'create',
            onSave: async (values): Promise<string | undefined> => {
                if (!this.canManageCollection(dialog, uid)) return;
                return collectionsStore.create(values);
            },
        });
        return { param: CREATE_COLLECTION_PARAM, dialog };
    }

    private createEditCollectionDialog(
        uid: string,
        collection: Collection,
    ): Omit<OpenDialog, 'key'> {
        const dialog = new CollectionDialog({
            mode: 'edit',
            initialValues: { name: collection.name, description: collection.description },
            loadGames: async () => {
                if (!this.canManageCollection(dialog, uid)) return;
                const games = await listItems(uid, collection.id);
                if (this.canManageCollection(dialog, uid)) return games;
            },
            onSave: async (values, removedSlugs = []): Promise<string | undefined> => {
                if (!this.canManageCollection(dialog, uid)) return;
                return collectionsStore.update(collection.id, values, removedSlugs);
            },
            onDelete: async (): Promise<string | undefined> => {
                if (!this.canManageCollection(dialog, uid)) return;
                return collectionsStore.delete(collection.id);
            },
        });
        return { param: EDIT_COLLECTION_PARAM, dialog };
    }

    private createAuth(query: URLSearchParams): Omit<OpenDialog, 'key'> {
        const dialog = new AuthDialog({
            initialTab: toAuthTab(query.get(AUTH_PARAM)),
            // Switching tabs rewrites the URL but must not add a history entry.
            onTabChange: (tab): void => setQueryParameter(AUTH_PARAM, tab, { replace: true }),
            onLogin: (values): Promise<void> => this.finishAuth(handleLogin(values)),
            onRegister: (values): Promise<void> => this.finishAuth(handleRegister(values)),
            onGoogleLogin: (): Promise<void> => this.finishAuth(handleGoogleLogin()),
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
        if (
            entry.param === EDIT_COLLECTION_PARAM &&
            entry.dialog.element.returnValue === 'deleted' &&
            this.route?.path.startsWith('/profile/collections/') &&
            this.route.params.id === this.query.get(EDIT_COLLECTION_PARAM)
        ) {
            this.router.navigate('/profile', { replace: true });
            return;
        }
        if (entry.param === GAME_PARAM) {
            this.router.removeQuery(GAME_PARAM, COLLECTION_PICKER_PARAM);
        } else {
            this.router.removeQuery(entry.param);
        }
    }

    // Success closes the dialog the same way the URL does: by dropping the auth param.
    private async finishAuth(attempt: Promise<boolean>): Promise<void> {
        if (await attempt) this.router.removeQuery(AUTH_PARAM);
    }

    private isAuthBlocked(): boolean {
        if (!appSession.getActiveSession()) return false;

        showSnackbar('You are already signed in.', 'info');

        return true;
    }

    private scheduleAuthCleanup(): void {
        queueMicrotask((): void => this.router.removeQueryInPlace(AUTH_PARAM));
    }

    // Must be called before router.start(), so a deep link opens its dialog on the first render.
    public start(): void {
        setAuthGuard((): boolean => this.isAuthBlocked());
        appSession.subscribe((session): void => {
            if (this.collectionOwner === undefined || this.collectionOwner === session?.uid) {
                return;
            }
            this.collectionOwner = undefined;
            if (
                this.current?.param === CREATE_COLLECTION_PARAM ||
                this.current?.param === EDIT_COLLECTION_PARAM
            ) {
                this.closeCurrent();
            }
            this.router.removeQueryInPlace(CREATE_COLLECTION_PARAM, EDIT_COLLECTION_PARAM);
        });
        collectionsStore.subscribe((state): void => {
            if (
                !this.query.get(EDIT_COLLECTION_PARAM) ||
                this.current?.param === EDIT_COLLECTION_PARAM ||
                state.uid !== this.collectionOwner
            ) {
                return;
            }
            this.sync(this.query);
        });
        this.router.onRouteChange((route: Route): void => {
            this.route = route;
            this.sync(route.query);
        });
    }
}
