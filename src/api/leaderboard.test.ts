import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { getLeaderboard } from './leaderboard';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

describe('getLeaderboard', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('requests /leaderboard with the signal and returns the players', async () => {
        const players = [{ playerName: 'Alex', score: 100 }];
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: players });

        await expect(getLeaderboard(signal)).resolves.toBe(players);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/leaderboard', { signal });
    });
});
