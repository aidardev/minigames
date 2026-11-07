import { openCreateCollection, setCollectionPickerOpen } from '@/app/navigation';
import { requireSession } from '@/app/require-auth';
import checkIcon from '@/assets/icons/check.svg?raw';
import collectionsIcon from '@/assets/icons/collections.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { CollectionNotFoundError } from '@/services/collections/collection-errors';
import { findCollectionIdsContaining } from '@/services/collections/collections-repo';
import { collectionsStore, type CollectionsState } from '@/services/collections/collections-store';
import { appSession } from '@/services/session/app-session';
import type { Collection, GamePreview } from '@/types/collection.types';
import { html, unsafeHtml, type SafeHtml } from '@/utils/html';
import './game-collection-picker.scss';

export class GameCollectionPicker extends BaseComponent<'div'> {
    private static nextId = 0;
    private readonly game: Readonly<GamePreview>;
    private readonly trigger: HTMLButtonElement;
    private readonly panel: HTMLElement;
    private readonly body: HTMLElement;
    private readonly unsubscribe: () => void;
    private state: CollectionsState = collectionsStore.getState();
    private membership: Set<string> | undefined;
    private membershipError = false;
    private requestId = 0;
    private userVersion = 0;
    private pendingId: string | undefined;
    private isOpen = false;
    private isDisposed = false;
    private isShowingLoading = false;
    private errorBanner: ErrorBanner | undefined;

    private readonly handleClick = (event: MouseEvent): void => {
        if (this.isDisposed || !(event.target instanceof Element)) return;
        if (event.target.closest('[data-action="toggle"]')) {
            const isOpen = this.panel.hasAttribute('hidden');
            setCollectionPickerOpen(isOpen);
            if (isOpen) requireSession('Sign in to add games to your collections.');
        } else if (event.target.closest('[data-action="create"]')) {
            if (requireSession('Sign in to create a collection.')) openCreateCollection();
        } else {
            const button = event.target.closest<HTMLButtonElement>('[data-collection-id]');
            const id = button?.dataset.collectionId;
            if (id && !button.disabled) void this.addGame(id);
        }
    };

    constructor(game: Readonly<GamePreview>, isOpen = false) {
        super('div', 'collection-picker');
        this.game = game;
        const panelId = `collection-picker-${++GameCollectionPicker.nextId}`;
        this.setHtml(html`
            <button
                class="collection-picker__trigger btn btn--medium btn--white"
                type="button"
                aria-controls="${panelId}"
                aria-expanded="false"
                data-action="toggle"
            >
                ${unsafeHtml(collectionsIcon)} Add to collection
            </button>
            <section
                class="collection-picker__panel"
                id="${panelId}"
                aria-label="Your collections"
                hidden
            >
                <h3 class="collection-picker__title">Choose a collection</h3>
                <div class="collection-picker__body" aria-live="polite"></div>
            </section>
        `);
        this.trigger = this.getElement<HTMLButtonElement>('[data-action="toggle"]');
        this.panel = this.getElement('.collection-picker__panel');
        this.body = this.getElement('.collection-picker__body');
        this.element.addEventListener('click', this.handleClick);
        this.unsubscribe = collectionsStore.subscribe((state): void => this.receiveState(state));
        this.setOpen(isOpen);
    }

    private receiveState(state: CollectionsState): void {
        if (this.isDisposed) return;
        if (state.uid !== this.state.uid) {
            this.userVersion += 1;
            this.requestId += 1;
            this.membership = undefined;
            this.membershipError = false;
            this.pendingId = undefined;
        }
        this.state = state;
        if (!this.isOpen) return;
        if (state.status === 'ready') void this.loadMembership();
        else this.render();
    }

    private async loadMembership(): Promise<void> {
        const requestId = ++this.requestId;
        const { uid, collections } = this.state;
        this.membership = undefined;
        this.membershipError = false;
        this.render();
        if (!uid || collections === undefined || appSession.getActiveSession()?.uid !== uid) return;
        try {
            const ids = await findCollectionIdsContaining(
                uid,
                collections.map((collection) => collection.id),
                this.game.slug,
            );
            if (this.isDisposed || requestId !== this.requestId) return;
            this.membership = new Set(ids);
        } catch {
            if (this.isDisposed || requestId !== this.requestId) return;
            this.membershipError = true;
        }
        this.render();
    }

    private showContent(content: SafeHtml | ErrorBanner): void {
        if (this.errorBanner) this.release(this.errorBanner);
        this.errorBanner = undefined;
        this.isShowingLoading = false;
        if (content instanceof ErrorBanner) {
            this.errorBanner = this.adopt(content);
            this.body.replaceChildren(content.element);
        } else {
            this.body.innerHTML = content.value;
        }
    }

    private render(): void {
        const { uid, collections, status } = this.state;
        const isVisible =
            this.isOpen && uid !== undefined && uid === appSession.getActiveSession()?.uid;
        this.panel.hidden = !isVisible;
        this.trigger.setAttribute('aria-expanded', String(isVisible));
        if (!isVisible) {
            this.showContent(html``);
            return;
        }
        this.body.setAttribute('aria-busy', String(this.pendingId !== undefined));
        if (status === 'error' || this.membershipError) {
            this.showContent(
                new ErrorBanner({
                    message: 'Your collections could not be loaded. Please try again.',
                    onRetry: (): void => {
                        if (this.state.status === 'error') void collectionsStore.reload();
                        else void this.loadMembership();
                    },
                }),
            );
        } else if (collections === undefined || this.membership === undefined) {
            this.body.setAttribute('aria-busy', 'true');
            if (this.isShowingLoading) return;
            this.showContent(html`
                <p class="sr-only" role="status">Loading your collections…</p>
                ${[1, 2, 3].map(() => skeletonHtml('collection-picker__skeleton'))}
            `);
            this.isShowingLoading = true;
        } else if (collections.length === 0) {
            this.showContent(html`
                <p class="collection-picker__message">
                    Create your first collection to save this game.
                </p>
                <button class="btn btn--medium btn--primary" type="button" data-action="create">
                    Create collection
                </button>
            `);
        } else {
            this.showContent(html`
                <ul class="collection-picker__list list-unstyled">
                    ${collections.map((collection) => this.renderCollection(collection))}
                </ul>
            `);
        }
    }

    private renderCollection(collection: Collection): SafeHtml {
        const isAdded = this.membership?.has(collection.id);
        const isPending = this.pendingId === collection.id;
        return html`
            <li>
                <button
                    class="collection-picker__option btn"
                    type="button"
                    data-collection-id="${collection.id}"
                    ${isAdded || this.pendingId !== undefined ? html`disabled` : ''}
                >
                    <span class="collection-picker__name">${collection.name}</span>
                    <span class="collection-picker__status">
                        ${
                            isAdded
                                ? html`<span class="collection-picker__check" aria-hidden="true">
                                      ${unsafeHtml(checkIcon)}
                                  </span>`
                                : ''
                        }
                        ${isAdded ? 'Already added' : isPending ? 'Adding…' : 'Add game'}
                    </span>
                </button>
            </li>
        `;
    }

    private async addGame(id: string): Promise<void> {
        if (this.pendingId !== undefined || !this.membership || this.membership.has(id)) return;
        const session = requireSession('Sign in to add games to your collections.');
        if (!session || session.uid !== this.state.uid) return;
        const userVersion = this.userVersion;
        this.pendingId = id;
        this.render();
        try {
            const added = await collectionsStore.addGame(id, this.game);
            if (added === undefined || !this.isCurrentUser(session.uid, userVersion)) return;
            this.membership?.add(id);
            showSnackbar(
                added ? 'Game added to collection.' : 'This game is already in the collection.',
                added ? 'success' : 'info',
            );
        } catch (error) {
            if (!this.isCurrentUser(session.uid, userVersion)) return;
            const message =
                error instanceof CollectionNotFoundError
                    ? 'This collection was not found or is no longer available.'
                    : 'Your game could not be added. Please try again.';
            showSnackbar(message, 'error');
            if (error instanceof CollectionNotFoundError) void collectionsStore.reload();
        } finally {
            if (this.isCurrentUser(session.uid, userVersion)) {
                this.pendingId = undefined;
                this.render();
            }
        }
    }

    private isCurrentUser(uid: string, userVersion: number): boolean {
        return (
            !this.isDisposed &&
            userVersion === this.userVersion &&
            appSession.getActiveSession()?.uid === uid
        );
    }

    public setOpen(isOpen: boolean): void {
        if (this.isDisposed || this.isOpen === isOpen) return;
        this.isOpen = isOpen;
        if (isOpen) {
            void this.loadMembership();
        } else {
            this.requestId += 1;
            this.render();
        }
    }

    public override destroy(): void {
        this.isDisposed = true;
        this.requestId += 1;
        this.unsubscribe();
        super.destroy();
    }
}
