import type { Favorite, FavoriteResponse } from '@/types/game-details.types';
import { apiClient } from './api-client';

export async function toggleFavorite(slug: string, userEmail: string): Promise<Favorite> {
    const response = await apiClient<FavoriteResponse>(
        `/games/${encodeURIComponent(slug)}/favorite`,
        {
            method: 'POST',
            body: {
                userEmail,
            },
        },
    );

    return response.data;
}
