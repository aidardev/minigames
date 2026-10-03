import type { CommentsResponse, GameComments } from '@/types/game-details.types';
import { apiClient } from './api-client';

const COMMENTS_LIMIT = 3;
const COMMENTS_SORT = 'newest';

export async function getComments(slug: string, signal?: AbortSignal): Promise<GameComments> {
    const response = await apiClient<CommentsResponse>(
        `/games/${encodeURIComponent(slug)}/comments`,
        {
            query: { limit: COMMENTS_LIMIT, sort: COMMENTS_SORT },
            signal,
        },
    );

    return {
        comments: response.data,
        total: response.meta.totalComments,
    };
}
