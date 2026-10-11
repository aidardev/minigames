import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { ApiError } from './api-error';
import { toggleFavorite } from './favorites';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

describe('toggleFavorite', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('posts the user email to the game favorite endpoint and returns the result', async () => {
        const favorite = { isFavorited: true, likesCount: 8 };
        vi.mocked(apiClient).mockResolvedValue({ data: favorite });

        await expect(toggleFavorite('cat-mail-co', 'alex@minigames.com')).resolves.toBe(favorite);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games/cat-mail-co/favorite', {
            method: 'POST',
            body: { userEmail: 'alex@minigames.com' },
        });
    });

    it('encodes the slug so it cannot change the URL path', async () => {
        vi.mocked(apiClient).mockResolvedValue({ data: {} });

        await toggleFavorite('a/b c', 'alex@minigames.com');

        expect(vi.mocked(apiClient).mock.calls[0]?.[0]).toBe('/games/a%2Fb%20c/favorite');
    });

    it('does not swallow request errors', async () => {
        const error = new ApiError('Game not found', 404);
        vi.mocked(apiClient).mockRejectedValue(error);

        await expect(toggleFavorite('missing', 'alex@minigames.com')).rejects.toBe(error);
    });
});
