import type { LeaderboardPlayer, LeaderboardResponse } from '@/types/leaderboard.types';

export async function getLeaderboard(): Promise<LeaderboardPlayer[]> {
    const response = await fetch('/mock-data/leaderboard.json');

    if (!response.ok) {
        throw new Error(`Failed to load leaderboard: ${response.status}`);
    }

    const seed: LeaderboardResponse = await response.json();

    return seed.data;
}
