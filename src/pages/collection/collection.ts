import { openAuth, openEditCollection, openGameDetails } from '@/app/navigation';
import type { RouteParameters } from '@/app/router';
import arrowBackIcon from '@/assets/icons/arrow-back.svg?raw';
import { BaseComponent } from '@/components/base-component';
import {
    CollectionSection,
    type CollectionSectionData,
} from '@/components/collection-section/collection-section';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { listItems } from '@/services/collections/collections-repo';
import { collectionsStore, type CollectionsState } from '@/services/collections/collections-store';
import { appSession } from '@/services/session/app-session';
import type { Collection, CollectionItem } from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { CollectionSkeleton } from './collection-skeleton';
import './collection.scss';

type LoadError = 'collection' | 'games';
type View = 'guest' | 'loading' | 'missing' | 'ready';

export class CollectionPage extends BaseComponent<'main'> {
    private readonly id: string | undefined;
    private readonly outlet: HTMLElement;
    private readonly notice: HTMLElement;
    private readonly fallbackTitle: HTMLElement;
    private readonly unsubscribeStore: () => void;
    private readonly unsubscribeSession: () => void;
    private uid: string | undefined;
    private state: CollectionsState = collectionsStore.getState();
    private content: BaseComponent | undefined;
    private view: View | undefined;
    private errorBanner: ErrorBanner | undefined;
    private displayedError: LoadError | undefined;
    private snapshot: CollectionSectionData | undefined;
    private itemsStatus: 'loading' | 'ready' | 'error' | undefined;
    private isMissing = false;
    private requestId = 0;

    constructor(_query: URLSearchParams, parameters: RouteParameters) {
        super('main', 'collection-page');
        this.id = parameters.id;
        this.setHtml(html`
            <div class="collection-page__content container">
                <a class="collection-page__back" href="/profile" data-link>
                    <span aria-hidden="true">${unsafeHtml(arrowBackIcon)}</span>
                    All collections
                </a>
                <h1 class="sr-only" data-fallback-title>Collection</h1>
                <div class="collection-page__notice" hidden></div>
                <div class="collection-page__outlet"></div>
            </div>
        `);
        this.outlet = this.getElement('.collection-page__outlet');
        this.notice = this.getElement('.collection-page__notice');
        this.fallbackTitle = this.getElement('[data-fallback-title]');
        this.unsubscribeStore = collectionsStore.subscribe((state): void =>
            this.receiveState(state),
        );
        this.unsubscribeSession = appSession.subscribe((session): void => {
            if (session?.uid === this.uid) return;
            this.uid = session?.uid;
            this.reset();
            this.receiveState(collectionsStore.getState());
        });
    }

    private reset(): void {
        this.requestId += 1;
        this.snapshot = undefined;
        this.itemsStatus = undefined;
        this.isMissing = false;
    }

    private receiveState(state: CollectionsState): void {
        this.state = state;
        if (state.uid !== this.uid || state.collections === undefined) {
            this.reset();
        } else if (state.status === 'ready') {
            const collection = state.collections.find((item) => item.id === this.id);
            if (collection) {
                void this.loadItems(collection);
                return;
            }
            this.reset();
            this.isMissing = true;
        }
        this.render();
    }

    private show(content: BaseComponent, view: View): void {
        if (this.content) this.release(this.content);
        this.content = this.adopt(content);
        this.view = view;
        this.outlet.replaceChildren(content.element);
    }

    private async loadItems(collection: Collection): Promise<void> {
        const uid = this.uid;
        if (!uid) return;
        const requestId = ++this.requestId;
        this.itemsStatus = 'loading';
        this.isMissing = false;
        this.render();
        let games: CollectionItem[];
        try {
            games = await listItems(uid, collection.id);
        } catch {
            if (requestId !== this.requestId) return;
            this.itemsStatus = 'error';
            this.render();
            return;
        }
        if (requestId !== this.requestId) return;
        this.snapshot = { collection, games };
        this.itemsStatus = 'ready';
        this.show(
            new CollectionSection({
                ...this.snapshot,
                variant: 'full',
                onGameClick: openGameDetails,
                onEdit: openEditCollection,
            }),
            'ready',
        );
        this.render();
    }

    private renderError(error: LoadError | undefined): void {
        if (error === this.displayedError) return;
        if (this.errorBanner) this.release(this.errorBanner);
        this.errorBanner = undefined;
        this.displayedError = error;
        this.notice.hidden = true;
        if (!error) return;
        this.errorBanner = this.adopt(
            new ErrorBanner({
                message:
                    error === 'collection'
                        ? 'This collection could not be loaded. Please try again.'
                        : 'The games in this collection could not be loaded. Please try again.',
                onRetry: (): void => {
                    const collection = this.state.collections?.find((item) => item.id === this.id);
                    if (error === 'games' && collection && this.state.uid === this.uid) {
                        void this.loadItems(collection);
                    } else {
                        void collectionsStore.reload();
                    }
                },
            }),
        );
        this.notice.replaceChildren(this.errorBanner.element);
        this.notice.hidden = false;
    }

    private render(): void {
        const isOwned = this.uid !== undefined && this.state.uid === this.uid;
        const error =
            isOwned && this.state.status === 'error'
                ? 'collection'
                : isOwned && this.itemsStatus === 'error'
                  ? 'games'
                  : undefined;
        this.fallbackTitle.hidden = this.snapshot !== undefined;
        this.outlet.setAttribute(
            'aria-busy',
            String(
                this.uid !== undefined &&
                    !error &&
                    (!isOwned || this.state.status === 'loading' || this.itemsStatus === 'loading'),
            ),
        );
        this.renderError(error);

        if (!this.uid) {
            if (this.view !== 'guest')
                this.show(
                    new EmptyState({
                        title: 'Sign in to view this collection',
                        description: 'Your game collections are private.',
                        action: { label: 'Sign in', onClick: (): void => openAuth('login') },
                    }),
                    'guest',
                );
        } else if (this.snapshot === undefined) {
            if (error) {
                if (this.content) this.release(this.content);
                this.content = undefined;
                this.view = undefined;
                this.outlet.replaceChildren();
            } else if (this.isMissing) {
                if (this.view !== 'missing')
                    this.show(
                        new EmptyState({
                            title: 'Collection not found or unavailable',
                            description: 'It may have been deleted or belong to another account.',
                        }),
                        'missing',
                    );
            } else if (this.view !== 'loading') {
                this.show(new CollectionSkeleton(), 'loading');
            }
        }
    }

    public override destroy(): void {
        this.requestId += 1;
        this.unsubscribeStore();
        this.unsubscribeSession();
        super.destroy();
    }
}
