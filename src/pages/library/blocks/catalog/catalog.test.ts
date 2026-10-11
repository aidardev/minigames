// @vitest-environment jsdom

import { ApiError } from '@/api/api-error';
import { getCategories } from '@/api/categories';
import { getGamesPage } from '@/api/games';
import { openGameDetails, setQueryParameters } from '@/app/navigation';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { Game, GameCategory, GamesPage } from '@/types/game.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryQuery } from '../../library-query';
import { CatalogSection } from './catalog';

vi.mock('@/api/categories', () => ({ getCategories: vi.fn() }));
vi.mock('@/api/games', () => ({ getGamesPage: vi.fn() }));
vi.mock('@/app/navigation', () => ({ setQueryParameters: vi.fn(), openGameDetails: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const INITIAL: LibraryQuery = { category: 'all', sort: 'rating-desc', page: 2 };
const CATEGORIES: GameCategory[] = [
    { slug: 'all', label: 'All games', isDefault: true },
    { slug: 'puzzle', label: 'Puzzle', isDefault: false },
];
const GAME: Game = {
    slug: 'cat-mail-co',
    name: 'Cat Mail',
    category: 'Puzzle',
    price: 'Free',
    shortDescription: 'Deliver mail',
    rating: 4.5,
    likesCount: 1200,
    cardImage: '/cat.png',
};
const RESULTS: GamesPage = { games: [GAME], page: 2, totalPages: 4 };

function query<T extends HTMLElement>(root: Element, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
}

async function settled(element: Element): Promise<void> {
    await vi.waitFor(() => expect(element.querySelector('[aria-busy="true"]')).toBeNull());
}

describe('CatalogSection', () => {
    const catalogs: CatalogSection[] = [];

    function setup(initial = INITIAL) {
        const catalog = new CatalogSection(initial);
        catalogs.push(catalog);
        document.body.append(catalog.element);
        const scroll = vi.fn();
        Object.defineProperty(catalog.element, 'scrollIntoView', { value: scroll });
        return { catalog, element: catalog.element, scroll };
    }

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => Object.assign(new EventTarget(), { matches: false })),
        );
        vi.mocked(getCategories).mockResolvedValue(CATEGORIES);
        vi.mocked(getGamesPage).mockResolvedValue(RESULTS);
    });

    afterEach(() => {
        for (const catalog of catalogs) catalog.destroy();
        catalogs.length = 0;
        vi.unstubAllGlobals();
    });

    it('loads categories and games with the initial URL filters and renders cards and pagination', async () => {
        const { element } = setup();
        expect(query(element, '.catalog__categories').getAttribute('aria-busy')).toBe('true');
        expect(query(element, '.catalog__results').getAttribute('aria-busy')).toBe('true');
        expect(getCategories).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
        expect(getGamesPage).toHaveBeenCalledExactlyOnceWith(
            { ...INITIAL, limit: 6 },
            expect.any(AbortSignal),
        );
        await settled(element);
        expect(query(element, '.chip--active').dataset.id).toBe('all');
        expect(query(element, '.dropdown__option--active').dataset.id).toBe('rating-desc');
        expect(query(element, '.game-card__title').textContent).toBe('Cat Mail');
        expect(query<HTMLImageElement>(element, '.game-card__img').getAttribute('src')).toBe(
            '/cat.png',
        );
        expect(query(element, '.pagination__page--active').textContent).toBe('2');
        query<HTMLButtonElement>(element, '.game-card__details').click();
        expect(openGameDetails).toHaveBeenCalledExactlyOnceWith(GAME.slug);
    });

    it('changes category and sort through navigation, resets page and waits for URL updates to refetch', async () => {
        const { element } = setup();
        await settled(element);
        query<HTMLButtonElement>(element, '.chip-group [data-id="puzzle"]').click();
        expect(setQueryParameters).toHaveBeenNthCalledWith(1, { category: 'puzzle', page: '1' });
        query<HTMLButtonElement>(element, '.dropdown__btn').click();
        query<HTMLButtonElement>(element, '.dropdown [data-id="name-asc"]').click();
        expect(setQueryParameters).toHaveBeenNthCalledWith(2, { sort: 'name-asc', page: '1' });
        expect(getGamesPage).toHaveBeenCalledOnce();
    });

    it('navigates to a new page and scrolls but ignores the current page', async () => {
        const { element, scroll } = setup();
        await settled(element);
        query<HTMLButtonElement>(element, '[data-page="2"]').click();
        expect(setQueryParameters).not.toHaveBeenCalled();
        expect(scroll).not.toHaveBeenCalled();
        query<HTMLButtonElement>(element, '[data-page="3"]').click();
        expect(setQueryParameters).toHaveBeenCalledExactlyOnceWith({ page: '3' });
        expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'start' });
        expect(getGamesPage).toHaveBeenCalledOnce();
    });

    it.each([{ category: 'puzzle' }, { sort: 'name-asc' }, { page: 3 }])(
        'refetches only games when URL state changes: %j',
        async (change) => {
            const { catalog, element } = setup();
            await settled(element);
            const next = { ...INITIAL, ...change };
            catalog.update(next);
            expect(getGamesPage).toHaveBeenCalledTimes(2);
            expect(getGamesPage).toHaveBeenLastCalledWith(
                { ...next, limit: 6 },
                expect.any(AbortSignal),
            );
            expect(getCategories).toHaveBeenCalledOnce();
            expect(query(element, '.chip--active').dataset.id).toBe(next.category);
            expect(query(element, '.dropdown__option--active').dataset.id).toBe(next.sort);
            expect(setQueryParameters).not.toHaveBeenCalled();
            await settled(element);
        },
    );

    it('does not refetch when the library query values are unchanged', async () => {
        const { catalog, element } = setup();
        await settled(element);
        catalog.update({ ...INITIAL });
        expect(getGamesPage).toHaveBeenCalledOnce();
        expect(getCategories).toHaveBeenCalledOnce();
        expect(setQueryParameters).not.toHaveBeenCalled();
    });

    it('uses the latest category when categories finish loading after a URL update', async () => {
        const categories = Promise.withResolvers<GameCategory[]>();
        vi.mocked(getCategories).mockReturnValue(categories.promise);
        const { catalog, element } = setup();
        catalog.update({ category: 'puzzle', sort: 'name-asc', page: 1 });
        categories.resolve(CATEGORIES);
        await settled(element);
        expect(query(element, '.chip--active').dataset.id).toBe('puzzle');
        expect(getGamesPage).toHaveBeenLastCalledWith(
            { category: 'puzzle', sort: 'name-asc', page: 1, limit: 6 },
            expect.any(AbortSignal),
        );
    });

    it('renders empty categories independently of the games', async () => {
        vi.mocked(getCategories).mockResolvedValue([]);
        const { element } = setup();
        await settled(element);
        expect(query(element, '.catalog__categories').textContent).toContain('No categories');
        expect(query(element, '.game-card__title').textContent).toBe('Cat Mail');
    });

    it('keeps pagination on page one when games are empty', async () => {
        vi.mocked(getGamesPage).mockResolvedValue({ games: [], page: 2, totalPages: 0 });
        const { element } = setup();
        await settled(element);
        expect(query(element, '.catalog__results').textContent).toContain('Data not found');
        expect(element.querySelectorAll('.game-card')).toHaveLength(0);
        expect(query(element, '.pagination__page--active').textContent).toBe('1');
        expect(query<HTMLButtonElement>(element, '[data-action="next"]').disabled).toBe(true);
    });

    it('treats a 400 games response as empty results without showing an error', async () => {
        vi.mocked(getGamesPage).mockRejectedValue(new ApiError('Invalid category', 400));
        const { element } = setup();
        await settled(element);
        expect(query(element, '.catalog__results').textContent).toContain('Data not found');
        expect(query(element, '.pagination__page--active').textContent).toBe('1');
        expect(element.querySelector('.error-banner')).toBeNull();
        expect(showSnackbar).not.toHaveBeenCalled();
    });

    it('shows other API errors and retries using the current URL filters', async () => {
        vi.mocked(getGamesPage)
            .mockRejectedValueOnce(new ApiError('Service unavailable', 503))
            .mockResolvedValueOnce(RESULTS);
        const { element } = setup();
        await settled(element);
        expect(query(element, '.catalog__results .error-banner').textContent).toContain(
            'Service unavailable',
        );
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith('Service unavailable', 'error');
        query<HTMLButtonElement>(element, '.error-banner__retry').click();
        await settled(element);
        expect(query(element, '.game-card__title').textContent).toBe('Cat Mail');
        expect(getGamesPage).toHaveBeenCalledTimes(2);
        expect(getGamesPage).toHaveBeenLastCalledWith(
            { ...INITIAL, limit: 6 },
            expect.any(AbortSignal),
        );
        expect(getCategories).toHaveBeenCalledOnce();
    });

    it('aborts both in-flight requests when destroyed', async () => {
        const categories = Promise.withResolvers<GameCategory[]>();
        const games = Promise.withResolvers<GamesPage>();
        vi.mocked(getCategories).mockReturnValue(categories.promise);
        vi.mocked(getGamesPage).mockReturnValue(games.promise);
        const { catalog, element } = setup();
        const categorySignal = vi.mocked(getCategories).mock.calls[0]?.[0];
        const gameSignal = vi.mocked(getGamesPage).mock.calls[0]?.[1];
        catalog.destroy();
        expect(categorySignal?.aborted).toBe(true);
        expect(gameSignal?.aborted).toBe(true);
        expect(element.isConnected).toBe(false);
        categories.resolve(CATEGORIES);
        games.resolve(RESULTS);
        await Promise.all([categories.promise, games.promise]);
        expect(element.querySelector('.game-card')).toBeNull();
        expect(showSnackbar).not.toHaveBeenCalled();
    });
});
