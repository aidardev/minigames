import type { NewComment } from '@/types/game-details.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type RequestOptions } from './api-client';
import { ApiError } from './api-error';
import { getComments, postComment, toggleCommentLike } from './comments';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

const EMAIL = 'alex@minigames.com';

function lastCall(): [string, RequestOptions] {
    const [endpoint = '', options = {}] = vi.mocked(apiClient).mock.calls[0] ?? [];

    return [endpoint, options];
}

describe('getComments', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('asks for the 3 newest comments of the game and returns comments with the total', async () => {
        const comments = [{ commentId: 'c1' }];
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: comments, meta: { totalComments: 7 } });

        const result = await getComments('cat-mail-co', { userEmail: EMAIL, signal });

        expect(result).toStrictEqual({ comments, total: 7 });
        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games/cat-mail-co/comments', {
            query: { limit: 3, sort: 'newest', userEmail: EMAIL },
            signal,
        });
    });

    it.each([
        ['no user email', {}],
        ['an empty user email', { userEmail: '' }],
    ])('does not send userEmail for a guest (%s)', async (_case, request) => {
        vi.mocked(apiClient).mockResolvedValue({ data: [], meta: { totalComments: 0 } });

        await getComments('cat-mail-co', request);

        expect(lastCall()[1].query).toStrictEqual({ limit: 3, sort: 'newest' });
    });

    it('works without the second argument', async () => {
        vi.mocked(apiClient).mockResolvedValue({ data: [], meta: { totalComments: 0 } });

        await expect(getComments('cat-mail-co')).resolves.toStrictEqual({
            comments: [],
            total: 0,
        });
    });

    it('encodes the slug so it cannot change the URL path', async () => {
        vi.mocked(apiClient).mockResolvedValue({ data: [], meta: { totalComments: 0 } });

        await getComments('a/b c');

        expect(lastCall()[0]).toBe('/games/a%2Fb%20c/comments');
    });
});

describe('postComment', () => {
    // Adjust the fields to the real NewComment type if they differ.
    const comment = { userEmail: EMAIL, text: 'Great game!' } as NewComment;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('posts the comment as the body and returns the created comment', async () => {
        const created = { commentId: 'c9', text: 'Great game!' };
        vi.mocked(apiClient).mockResolvedValue({ data: created });

        await expect(postComment('cat-mail-co', comment)).resolves.toBe(created);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/games/cat-mail-co/comments', {
            method: 'POST',
            body: comment,
        });
    });

    it('does not swallow request errors', async () => {
        const error = new ApiError('Invalid comment', 400);
        vi.mocked(apiClient).mockRejectedValue(error);

        await expect(postComment('cat-mail-co', comment)).rejects.toBe(error);
    });
});

describe('toggleCommentLike', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('posts the user email to the comment like endpoint and returns the result', async () => {
        const like = { isLiked: true, likesCount: 3 };
        vi.mocked(apiClient).mockResolvedValue({ data: like });

        await expect(toggleCommentLike('c1', EMAIL)).resolves.toBe(like);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/comments/c1/like', {
            method: 'POST',
            body: { userEmail: EMAIL },
        });
    });

    it('encodes the comment id so it cannot change the URL path', async () => {
        vi.mocked(apiClient).mockResolvedValue({ data: {} });

        await toggleCommentLike('a/b c', EMAIL);

        expect(lastCall()[0]).toBe('/comments/a%2Fb%20c/like');
    });

    it('does not swallow request errors', async () => {
        const error = new ApiError('Comment not found', 404);
        vi.mocked(apiClient).mockRejectedValue(error);

        await expect(toggleCommentLike('missing', EMAIL)).rejects.toBe(error);
    });
});
