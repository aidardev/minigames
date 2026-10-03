import type { LeaderboardPlayer, LeaderboardResponse } from '@/types/leaderboard.types';
import { apiClient } from './api-client';

export async function getLeaderboard(signal?: AbortSignal): Promise<LeaderboardPlayer[]> {
    const response = await apiClient<LeaderboardResponse>('/leaderboard', { signal });

    return response.data;
}
