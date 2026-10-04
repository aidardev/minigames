import { isBadRequestError } from '@/api/api-error';
import { getCategories } from '@/api/categories';
import { getGamesPage } from '@/api/games';
import { setQueryParameters } from '@/app/navigation';
import { AsyncRegion } from '@/components/async-region/async-region';
import { BaseComponent } from '@/components/base-component';
import { ChipGroup } from '@/components/chip-group/chip-group';
import type { ChipOption } from '@/components/chip-group/chip-group.types';
import { Dropdown } from '@/components/dropdown/dropdown';
import { EmptyState } from '@/components/empty-state/empty-state';
import type { GameCategory, GamesPage } from '@/types/game.types';
import { html } from '@/utils/html';
import { isSameLibraryQuery, type LibraryQuery } from '../../library-query';
import { CatalogResults } from './catalog-results';
import { CatalogResultsSkeleton, CategoriesSkeleton } from './catalog-skeletons';
import { GAMES_PER_PAGE, SORT_OPTIONS } from './catalog.constants';
import './catalog.scss';

export class CatalogSection extends BaseComponent<'section'> {
    // The URL-derived state: the single input of every games request.
    private urlQuery: LibraryQuery;
    // Exists once categories are loaded; kept so Back/Forward can move the highlight.
    private chipGroup: ChipGroup | undefined;
    private readonly dropdown: Dropdown;
    private readonly categoriesRegion: AsyncRegion<GameCategory[]>;
    private readonly resultsRegion: AsyncRegion<GamesPage>;

    constructor(query: LibraryQuery) {
        super('section', 'section-catalog');
        this.urlQuery = query;

        this.setHtml(html`
            <h2 class="sr-only">Game catalog</h2>
            <div class="catalog container">
                <div class="catalog__controls"></div>
            </div>
        `);

        this.dropdown = this.adopt(
            new Dropdown({
                options: SORT_OPTIONS,
                activeId: query.sort,
                modifier: 'catalog__sort',
                // A new sort starts again from the first page.
                onChange: (sort: string): void => setQueryParameters({ sort, page: '1' }),
            }),
        );

        this.categoriesRegion = this.adopt(
            new AsyncRegion<GameCategory[]>(
                {
                    load: (signal: AbortSignal): Promise<GameCategory[]> => getCategories(signal),
                    renderSkeleton: (): CategoriesSkeleton => new CategoriesSkeleton(),
                    renderSuccess: (categories: GameCategory[]): ChipGroup =>
                        this.createChipGroup(categories),
                    renderEmpty: (): EmptyState => new EmptyState({ title: 'No categories' }),
                },
                'catalog__categories',
            ),
        );

        this.resultsRegion = this.adopt(
            new AsyncRegion<GamesPage>(
                {
                    // Reads this.urlQuery at call time, so every load uses the latest URL state.
                    load: (signal: AbortSignal): Promise<GamesPage> =>
                        getGamesPage({ ...this.urlQuery, limit: GAMES_PER_PAGE }, signal),
                    renderSkeleton: (): CatalogResultsSkeleton => new CatalogResultsSkeleton(),
                    // An empty list is not an "empty region": CatalogResults draws the empty
                    // state itself so the pagination stays visible.
                    renderSuccess: (data: GamesPage): CatalogResults => this.createResults(data),
                    renderError: (error: unknown): CatalogResults | undefined =>
                        this.renderInvalidParameters(error),
                },
                'catalog__results',
            ),
        );

        this.query('.catalog__controls')?.append(
            this.categoriesRegion.element,
            this.dropdown.element,
        );
        this.query('.catalog')?.append(this.resultsRegion.element);

        void this.categoriesRegion.load();
        void this.resultsRegion.load();
    }

    private createChipGroup(categories: GameCategory[]): ChipGroup {
        const chipGroup = new ChipGroup({
            options: categories.map((category: GameCategory): ChipOption => ({
                id: category.slug,
                label: category.label,
            })),
            activeId: this.urlQuery.category,
            modifier: 'catalog__chip-group',
            // A new category starts again from the first page.
            onChange: (category: string): void => setQueryParameters({ category, page: '1' }),
        });

        this.chipGroup = chipGroup;

        return chipGroup;
    }

    private createResults(data: GamesPage): CatalogResults {
        return new CatalogResults({
            ...data,
            onPageChange: (page: number): void => {
                // Re-selecting the page that is already in the URL changes nothing.
                if (page === this.urlQuery.page) return;

                setQueryParameters({ page: String(page) });

                this.element.scrollIntoView({ block: 'start' });
            },
        });
    }

    // The API answers 400 for filter values it does not know (a hand-edited URL). That means
    // "no data for these filters", not an outage, so it gets the empty-results view.
    private renderInvalidParameters(error: unknown): CatalogResults | undefined {
        if (!isBadRequestError(error)) return undefined;

        return this.createResults({ games: [], page: 1, totalPages: 1 });
    }

    /**
    Called by the page whenever the URL changes while Library is open.
    */
    public update(next: LibraryQuery): void {
        const previous = this.urlQuery;
        this.urlQuery = next;

        // The controls follow the URL (Back/Forward, deep links, corrected values).
        this.chipGroup?.setActive(next.category);
        this.dropdown.setActive(next.sort);

        // Other query changes (e.g. ?game= opening a dialog) must not refetch the list.
        if (!isSameLibraryQuery(previous, next)) void this.resultsRegion.load();
    }
}
