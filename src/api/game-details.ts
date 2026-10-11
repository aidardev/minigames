import type { GameDetails, GameDetailsResponse } from '@/types/game-details.types';
import { apiClient } from './api-client';

export interface GameDetailsRequest {
    userEmail?: string;
    signal?: AbortSignal;
}

export async function getGameDetails(
    slug: string,
    { signal, userEmail }: GameDetailsRequest = {},
): Promise<GameDetails> {
    const response = await apiClient<GameDetailsResponse>(`/games/${encodeURIComponent(slug)}`, {
        ...(userEmail && { query: { userEmail } }),
        signal,
    });

    return response.data;
}
