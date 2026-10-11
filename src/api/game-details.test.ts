import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type RequestOptions } from './api-client';
import { getGameDetails } from './game-details';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

function lastOptions(): RequestOptions {
    return vi.mocked(apiClient).mock.calls[0]?.[1] ?? {};
}

describe('getGameDetails', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns the game from the response', async () => {
        const game = { slug: 'cat-mail-co' };
        vi.mocked(apiClient).mockResolvedValue({ data: game });

        await expect(getGameDetails('cat-mail-co')).resolves.toBe(game);
    });

    it('requests the game by slug and sends the user email for a signed-in user', async () => {
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: {} });

        await getGameDetails('cat-mail-co', { userEmail: 'alex@minigames.com', signal });

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games/cat-mail-co', {
            query: { userEmail: 'alex@minigames.com' },
            signal,
        });
    });

    it.each([
        ['no user email', {}],
        ['an empty user email', { userEmail: '' }],
    ])('sends no query for a guest (%s)', async (_case, request) => {
        vi.mocked(apiClient).mockResolvedValue({ data: {} });

        await getGameDetails('cat-mail-co', request);

        expect(lastOptions()).not.toHaveProperty('query');
    });

    it('encodes the slug so it cannot change the URL path', async () => {
        vi.mocked(apiClient).mockResolvedValue({ data: {} });

        await getGameDetails('a/b c');

        expect(vi.mocked(apiClient).mock.calls[0]?.[0]).toBe('/games/a%2Fb%20c');
    });
});
