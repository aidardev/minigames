import type { CategoriesResponse, GameCategory } from '@/types/game.types';

export async function getCategories(): Promise<GameCategory[]> {
    const response = await fetch('/mock-data/categories.json');

    if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.status}`);
    }

    const payload: CategoriesResponse = await response.json();

    return payload.data;
}
