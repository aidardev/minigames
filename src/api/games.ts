import type { Game, GamesResponse } from '@/types/game.types';
import { apiClient } from './api-client';

export async function getGames(): Promise<Game[]> {
    const response = await fetch('/mock-data/all-games-seed.json');

    if (!response.ok) {
        throw new Error(`Failed to load games: ${response.status}`);
    }

    const seed: GamesResponse = await response.json();

    return seed.data;
}

export async function getFeaturedGames(signal?: AbortSignal): Promise<Game[]> {
    const response = await apiClient<GamesResponse>('/games', {
        query: { featured: true },
        signal,
    });

    return response.data;
}
