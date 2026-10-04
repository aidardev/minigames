import type { Game, GamesPage, GamesResponse } from '@/types/game.types';
import { apiClient } from './api-client';

export interface GamesPageParameters {
    category: string;
    sort: string;
    page: number;
    limit: number;
}

export async function getGamesPage(
    { category, sort, page, limit }: GamesPageParameters,
    signal?: AbortSignal,
): Promise<GamesPage> {
    const response = await apiClient<GamesResponse>('/games', {
        query: { category, sort, page, limit },
        signal,
    });

    return {
        games: response.data,
        page: response.meta.page,
        totalPages: response.meta.totalPages,
    };
}

export async function getFeaturedGames(signal?: AbortSignal): Promise<Game[]> {
    const response = await apiClient<GamesResponse>('/games', {
        query: { featured: true },
        signal,
    });

    return response.data;
}
