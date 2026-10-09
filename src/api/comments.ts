import type { CommentsResponse, GameComments } from '@/types/game-details.types';
import { apiClient } from './api-client';

export interface CommentsRequest {
    userEmail?: string;
    signal?: AbortSignal;
}

const COMMENTS_LIMIT = 3;
const COMMENTS_SORT = 'newest';

export async function getComments(
    slug: string,
    { userEmail, signal }: CommentsRequest = {},
): Promise<GameComments> {
    const response = await apiClient<CommentsResponse>(
        `/games/${encodeURIComponent(slug)}/comments`,
        {
            query: { limit: COMMENTS_LIMIT, sort: COMMENTS_SORT, ...(userEmail && { userEmail }) },
            signal,
        },
    );

    return {
        comments: response.data,
        total: response.meta.totalComments,
    };
}
