import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { getFeaturedGames, getGamesPage } from './games';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

describe('getGamesPage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('sends category, sort, page and limit to the server', async () => {
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: [], meta: { page: 2, totalPages: 5 } });

        await getGamesPage({ category: 'puzzle', sort: 'rating', page: 2, limit: 12 }, signal);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games', {
            query: { category: 'puzzle', sort: 'rating', page: 2, limit: 12 },
            signal,
        });
    });

    it('maps the response to games, page and totalPages', async () => {
        const games = [{ slug: 'cat-mail-co' }];
        vi.mocked(apiClient).mockResolvedValue({ data: games, meta: { page: 2, totalPages: 5 } });

        const result = await getGamesPage({ category: 'all', sort: 'new', page: 2, limit: 12 });

        expect(result).toStrictEqual({ games, page: 2, totalPages: 5 });
    });

    it('lets request errors through', async () => {
        const error = new Error('down');
        vi.mocked(apiClient).mockRejectedValue(error);

        await expect(
            getGamesPage({ category: 'all', sort: 'new', page: 1, limit: 12 }),
        ).rejects.toBe(error);
    });
});

describe('getFeaturedGames', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('asks the server for featured games and returns them', async () => {
        const games = [{ slug: 'cat-mail-co' }];
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: games });

        await expect(getFeaturedGames(signal)).resolves.toBe(games);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games', {
            query: { featured: true },
            signal,
        });
    });
});
