import type { CategoriesResponse, GameCategory } from '@/types/game.types';
import { apiClient } from './api-client';

export async function getCategories(signal?: AbortSignal): Promise<GameCategory[]> {
    const response = await apiClient<CategoriesResponse>('/categories', { signal });

    return response.data;
}
