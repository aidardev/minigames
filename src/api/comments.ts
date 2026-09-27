import type { Comment, CommentsResponse } from '@/types/game-details.types';

export async function getComments(): Promise<Comment[]> {
    const response = await fetch('/mock-data/comments-tukoni-forest-keepers.json');

    if (!response.ok) {
        throw new Error(`Failed to load comments: ${response.status}`);
    }

    const payload: CommentsResponse = await response.json();

    return payload.data;
}
