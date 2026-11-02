import { AsyncRegion } from '@/components/async-region/async-region';
import { BaseComponent } from '@/components/base-component';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { listItems } from '@/services/collections/collections-repo';
import { collectionsStore, type CollectionsState } from '@/services/collections/collections-store';
import type { Collection } from '@/types/collection.types';
import type { CollectionSectionData } from '../collection-section/collection-section';
import type { ProfileStatistics } from '../profile-summary/profile-summary';
import { CollectionsSection } from './collections';
import { CollectionsSkeleton } from './collections-skeleton';

interface ProfileCollectionsProperties {
    uid: string;
    onStatisticsChange: (statistics: ProfileStatistics) => void;
}

export class ProfileCollections extends BaseComponent<'div'> {
    private readonly uid: string;
    private readonly onStatisticsChange: (statistics: ProfileStatistics) => void;
    private readonly unsubscribe: () => void;
    private readonly notice = document.createElement('div');
    private readonly outlet = document.createElement('div');
    private content: BaseComponent | undefined;
    private errorBanner: ErrorBanner | undefined;
    private displayedCollections: readonly Collection[] | undefined;

    constructor({ uid, onStatisticsChange }: ProfileCollectionsProperties) {
        super('div', 'profile-collections-content');
        this.uid = uid;
        this.onStatisticsChange = onStatisticsChange;
        this.notice.hidden = true;
        this.notice.className = 'profile-collections-content__notice';
        this.element.append(this.notice, this.outlet);

        this.unsubscribe = collectionsStore.subscribe((state): void => this.renderState(state));
    }

    private show(content: BaseComponent): void {
        if (this.content) this.release(this.content);
        this.content = this.adopt(content);
        this.outlet.replaceChildren(content.element);
    }

    private clearNotice(): void {
        if (this.errorBanner) this.release(this.errorBanner);
        this.errorBanner = undefined;
        this.notice.hidden = true;
    }

    private renderState(state: CollectionsState): void {
        this.clearNotice();

        if (state.status === 'idle' || state.status === 'loading') {
            this.outlet.setAttribute('aria-busy', 'true');

            if (state.collections.length > 0) {
                this.showCollections(state.collections);
            } else {
                this.displayedCollections = undefined;
                this.onStatisticsChange({ collectionsCount: 'loading', gamesCount: 'loading' });
                this.show(new CollectionsSkeleton());
            }
            return;
        }

        this.outlet.removeAttribute('aria-busy');

        if (state.status === 'error') {
            const banner = new ErrorBanner({
                message: 'Your collections could not be loaded. Please try again.',
                onRetry: (): void => {
                    void collectionsStore.reload();
                },
            });

            if (state.collections.length > 0) {
                this.showCollections(state.collections);
                this.errorBanner = this.adopt(banner);
                this.notice.replaceChildren(banner.element);
                this.notice.hidden = false;
            } else {
                this.onStatisticsChange({
                    collectionsCount: 'unavailable',
                    gamesCount: 'unavailable',
                });
                this.show(banner);
            }
            return;
        }

        this.showCollections(state.collections);
    }

    private showCollections(collections: readonly Collection[]): void {
        if (collections === this.displayedCollections) return;
        this.displayedCollections = collections;

        if (collections.length === 0) {
            this.onStatisticsChange({ collectionsCount: 0, gamesCount: 0 });
            this.show(new CollectionsSection([]));
            return;
        }

        const region = new AsyncRegion<CollectionSectionData[]>({
            load: (): Promise<CollectionSectionData[]> =>
                Promise.all(
                    collections.map(async (collection): Promise<CollectionSectionData> => ({
                        collection,
                        games: await listItems(this.uid, collection.id),
                    })),
                ),
            renderSkeleton: (): CollectionsSkeleton => {
                this.onStatisticsChange({
                    collectionsCount: collections.length,
                    gamesCount: 'loading',
                });
                return new CollectionsSkeleton();
            },
            renderSuccess: (data): CollectionsSection => {
                const gamesCount = new Set(
                    data.flatMap(({ games }) => games.map(({ slug }) => slug)),
                ).size;
                this.onStatisticsChange({ collectionsCount: data.length, gamesCount });
                return new CollectionsSection(data);
            },
            renderError: (_error, retry): ErrorBanner => {
                this.onStatisticsChange({
                    collectionsCount: collections.length,
                    gamesCount: 'unavailable',
                });
                return new ErrorBanner({
                    message: 'The games in your collections could not be loaded. Please try again.',
                    onRetry: retry,
                });
            },
        });

        this.show(region);
        void region.load();
    }

    public override destroy(): void {
        this.unsubscribe();
        super.destroy();
    }
}
