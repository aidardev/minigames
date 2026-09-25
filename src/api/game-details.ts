import type { GameDetails, GameDetailsResponse } from '@/types/game-details.types';

export async function getGameDetails(): Promise<GameDetails> {
    const response = await fetch('/mock-data/game-tukoni-forest-keepers.json');

    if (!response.ok) {
        throw new Error(`Failed to load game details: ${response.status}`);
    }

    const payload: GameDetailsResponse = await response.json();

    return payload.data;
}
