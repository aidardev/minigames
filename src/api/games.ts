import type { Game, GamesResponse } from '@/types/game.types';

export async function getGames(): Promise<Game[]> {
    const response = await fetch('/mock-data/all-games-seed.json');

    if (!response.ok) {
        throw new Error(`Failed to load games: ${response.status}`);
    }

    const seed: GamesResponse = await response.json();

    return seed.data;
}
