import type { GameDetails, GameDetailsResponse } from '@/types/game-details.types';
import { apiClient } from './api-client';

export async function getGameDetails(slug: string, signal?: AbortSignal): Promise<GameDetails> {
    const response = await apiClient<GameDetailsResponse>(`/games/${encodeURIComponent(slug)}`, {
        signal,
    });

    return response.data;
}
