import { BaseComponent } from '@/components/base-component';
import type { CollectionSectionData } from '@/components/collection-section/collection-section';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { listItems } from '@/services/collections/collections-repo';
import { collectionsStore, type CollectionsState } from '@/services/collections/collections-store';
import type { Collection } from '@/types/collection.types';
import type { ProfileStatistics } from '../profile-summary/profile-summary';
import { CollectionsSection } from './collections';
import { CollectionsSkeleton } from './collections-skeleton';

interface ProfileCollectionsProperties {
    uid: string;
    onStatisticsChange: (statistics: ProfileStatistics) => void;
}

type LoadError = 'collections' | 'games';

export class ProfileCollections extends BaseComponent<'div'> {
    private readonly uid: string;
    private readonly onStatisticsChange: (statistics: ProfileStatistics) => void;
    private readonly unsubscribe: () => void;
    private readonly notice = document.createElement('div');
    private readonly outlet = document.createElement('div');
    private content: BaseComponent | undefined;
    private errorBanner: ErrorBanner | undefined;
    private displayedError: LoadError | undefined;
    private state: CollectionsState = collectionsStore.getState();
    private itemsStatus: 'loading' | 'ready' | 'error' | undefined;
    // Only complete results replace the visible snapshot, including an empty result.
    private snapshot: readonly CollectionSectionData[] | undefined;
    private requestId = 0;

    constructor({ uid, onStatisticsChange }: ProfileCollectionsProperties) {
        super('div', 'profile-collections-content');
        this.uid = uid;
        this.onStatisticsChange = onStatisticsChange;
        this.notice.hidden = true;
        this.notice.className = 'profile-collections-content__notice';
        this.element.append(this.notice, this.outlet);

        this.unsubscribe = collectionsStore.subscribe((state): void => this.receiveState(state));
    }

    private show(content: BaseComponent): void {
        if (this.content) this.release(this.content);
        this.content = this.adopt(content);
        this.outlet.replaceChildren(content.element);
    }

    private receiveState(state: CollectionsState): void {
        this.state = state;

        if (state.uid !== this.uid || state.collections === undefined) {
            this.requestId += 1;
            this.itemsStatus = undefined;
            this.snapshot = undefined;
        } else if (!this.itemsStatus || state.status === 'ready') {
            void this.loadItems(state.collections);
            return;
        }

        this.render();
    }

    private async loadItems(collections: readonly Collection[]): Promise<void> {
        const requestId = ++this.requestId;
        this.itemsStatus = 'loading';
        this.render();

        let data: CollectionSectionData[];

        try {
            data = await Promise.all(
                collections.map(async (collection): Promise<CollectionSectionData> => ({
                    collection,
                    games: await listItems(this.uid, collection.id),
                })),
            );
        } catch {
            if (requestId !== this.requestId) return;
            this.itemsStatus = 'error';
            this.render();
            return;
        }

        // Firestore reads continue in the background; only the current request may publish.
        if (requestId !== this.requestId) return;

        this.snapshot = data;
        this.itemsStatus = 'ready';
        this.show(new CollectionsSection(data));
        this.render();
    }

    private retry(error: LoadError): void {
        if (error === 'collections') {
            void collectionsStore.reload();
        } else if (this.state.uid === this.uid && this.state.collections !== undefined) {
            void this.loadItems(this.state.collections);
        }
    }

    private renderError(error: LoadError | undefined): void {
        if (error === this.displayedError) return;
        if (this.errorBanner) this.release(this.errorBanner);
        this.errorBanner = undefined;
        this.displayedError = error;
        this.notice.hidden = true;

        if (!error) return;

        const banner = new ErrorBanner({
            message:
                error === 'collections'
                    ? 'Your collections could not be loaded. Please try again.'
                    : 'The games in your collections could not be loaded. Please try again.',
            onRetry: (): void => this.retry(error),
        });

        this.errorBanner = this.adopt(banner);
        this.notice.replaceChildren(banner.element);
        this.notice.hidden = false;
    }

    private render(): void {
        const isOwned = this.state.uid === this.uid;
        const collections = isOwned ? this.state.collections : undefined;
        const error =
            isOwned && this.state.status === 'error'
                ? 'collections'
                : this.itemsStatus === 'error'
                  ? 'games'
                  : undefined;
        const isLoading = !error && (collections === undefined || this.itemsStatus === 'loading');
        const isBusy = isLoading || (isOwned && this.state.status === 'loading');
        this.outlet.setAttribute('aria-busy', String(isBusy));

        if (this.snapshot === undefined) {
            this.onStatisticsChange({
                collectionsCount: collections?.length ?? (error ? 'unavailable' : 'loading'),
                gamesCount: error ? 'unavailable' : 'loading',
            });
            if (error) {
                if (this.content) this.release(this.content);
                this.content = undefined;
                this.outlet.replaceChildren();
            } else if (!(this.content instanceof CollectionsSkeleton)) {
                this.show(new CollectionsSkeleton());
            }
        } else {
            const gamesCount = new Set(
                this.snapshot.flatMap(({ games }) => games.map(({ slug }) => slug)),
            ).size;
            this.onStatisticsChange({ collectionsCount: this.snapshot.length, gamesCount });
        }

        this.renderError(error);
    }

    public override destroy(): void {
        this.requestId += 1;
        this.unsubscribe();
        super.destroy();
    }
}
