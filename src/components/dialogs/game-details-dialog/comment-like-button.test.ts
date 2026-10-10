// @vitest-environment jsdom

import { ApiError } from '@/api/api-error';
import { toggleCommentLike } from '@/api/comments';
import { requireSession } from '@/app/require-auth';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { CommentLike } from '@/types/game-details.types';
import { HttpStatus } from '@/utils/status-codes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentLikeButton } from './comment-like-button';

vi.mock('@/api/comments', () => ({ toggleCommentLike: vi.fn() }));
vi.mock('@/app/require-auth', () => ({ requireSession: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const COMMENT_ID = 'c1b2-uuid';
const SESSION = { displayName: 'Alex', email: 'alex@minigames.com', authenticatedAt: 1 };

function createDeferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>();
}

function setup({ isLiked = false, likesCount = 5 } = {}): HTMLButtonElement {
    return new CommentLikeButton({ commentId: COMMENT_ID, isLiked, likesCount }).element;
}

function isPressed(element: HTMLElement): boolean {
    return element.getAttribute('aria-pressed') === 'true';
}

function getCount(element: HTMLElement): string | undefined {
    return element.querySelector('[data-like-count]')?.textContent?.trim();
}

describe('CommentLikeButton', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requireSession).mockReturnValue(SESSION);
    });

    describe('initial state', () => {
        it('shows an inactive button with the count when not liked', () => {
            const element = setup({ isLiked: false, likesCount: 5 });

            expect(isPressed(element)).toBe(false);
            expect(element.classList.contains('is-active')).toBe(false);
            expect(element.getAttribute('aria-label')).toBe('Like comment');
            expect(getCount(element)).toBe('5');
        });

        it('shows an active button when liked', () => {
            const element = setup({ isLiked: true, likesCount: 6 });

            expect(isPressed(element)).toBe(true);
            expect(element.classList.contains('is-active')).toBe(true);
            expect(element.getAttribute('aria-label')).toBe('Unlike comment');
            expect(getCount(element)).toBe('6');
        });

        it('is clickable for a guest, so the click can open Auth', () => {
            vi.mocked(requireSession).mockReturnValue(undefined);

            expect(setup().disabled).toBe(false);
        });
    });

    describe('guest', () => {
        it('sends no request and stays unlocked', () => {
            vi.mocked(requireSession).mockReturnValue(undefined);
            const element = setup();

            element.click();

            expect(requireSession).toHaveBeenCalledOnce();
            expect(toggleCommentLike).not.toHaveBeenCalled();
            expect(element.disabled).toBe(false);
            expect(element.classList.contains('is-loading')).toBe(false);
            expect(isPressed(element)).toBe(false);
        });
    });

    describe('authenticated user', () => {
        it('sends the request with the comment id and the session email', async () => {
            vi.mocked(toggleCommentLike).mockResolvedValue({
                isLikedByCurrentUser: true,
                likesCount: 6,
            });
            const element = setup();

            element.click();
            await vi.waitFor((): void => expect(element.disabled).toBe(false));

            expect(toggleCommentLike).toHaveBeenCalledOnce();
            expect(toggleCommentLike).toHaveBeenCalledWith(COMMENT_ID, 'alex@minigames.com');
        });

        it('locks the button and shows loading while the request is pending', async () => {
            const request = createDeferred<CommentLike>();
            vi.mocked(toggleCommentLike).mockReturnValue(request.promise);
            const element = setup();

            element.click();

            expect(element.disabled).toBe(true);
            expect(element.classList.contains('is-loading')).toBe(true);
            expect(element.getAttribute('aria-busy')).toBe('true');

            request.resolve({ isLikedByCurrentUser: true, likesCount: 6 });
            await vi.waitFor((): void => expect(element.disabled).toBe(false));

            expect(element.classList.contains('is-loading')).toBe(false);
            expect(element.getAttribute('aria-busy')).toBe('false');
        });

        it('does not send a second request while the first one is pending', async () => {
            const request = createDeferred<CommentLike>();
            vi.mocked(toggleCommentLike).mockReturnValue(request.promise);
            const element = setup();

            element.click();
            element.click();
            element.click();

            expect(toggleCommentLike).toHaveBeenCalledOnce();

            request.resolve({ isLikedByCurrentUser: true, likesCount: 6 });
            await vi.waitFor((): void => expect(element.disabled).toBe(false));
        });

        it('does not change the state until the server responds', async () => {
            const request = createDeferred<CommentLike>();
            vi.mocked(toggleCommentLike).mockReturnValue(request.promise);
            const element = setup({ isLiked: false, likesCount: 5 });

            element.click();

            expect(isPressed(element)).toBe(false);
            expect(getCount(element)).toBe('5');

            request.resolve({ isLikedByCurrentUser: true, likesCount: 6 });
            await vi.waitFor((): void => expect(isPressed(element)).toBe(true));
        });

        it('applies the state and the count from the server response', async () => {
            vi.mocked(toggleCommentLike).mockResolvedValue({
                isLikedByCurrentUser: true,
                likesCount: 9,
            });
            const element = setup({ isLiked: false, likesCount: 5 });

            element.click();
            await vi.waitFor((): void => expect(element.disabled).toBe(false));

            expect(isPressed(element)).toBe(true);
            expect(element.classList.contains('is-active')).toBe(true);
            expect(element.getAttribute('aria-label')).toBe('Unlike comment');
            expect(getCount(element)).toBe('9');
        });

        it('unlikes when the server confirms it', async () => {
            vi.mocked(toggleCommentLike).mockResolvedValue({
                isLikedByCurrentUser: false,
                likesCount: 4,
            });
            const element = setup({ isLiked: true, likesCount: 5 });

            element.click();
            await vi.waitFor((): void => expect(isPressed(element)).toBe(false));

            expect(getCount(element)).toBe('4');
            expect(element.classList.contains('is-active')).toBe(false);
        });

        it('follows the server even when it contradicts a local flip', async () => {
            vi.mocked(toggleCommentLike).mockResolvedValue({
                isLikedByCurrentUser: false,
                likesCount: 12,
            });
            const element = setup({ isLiked: false, likesCount: 5 });

            element.click();
            await vi.waitFor((): void => expect(getCount(element)).toBe('12'));

            expect(isPressed(element)).toBe(false);
        });
    });

    describe('request failure', () => {
        it('shows the server message, keeps the state and unlocks the button', async () => {
            vi.mocked(toggleCommentLike).mockRejectedValue(
                new ApiError('Comment not found', HttpStatus.NOT_FOUND),
            );
            const element = setup({ isLiked: false, likesCount: 5 });

            element.click();
            await vi.waitFor((): void => expect(element.disabled).toBe(false));

            expect(showSnackbar).toHaveBeenCalledOnce();
            expect(showSnackbar).toHaveBeenCalledWith('Comment not found', 'error');
            expect(isPressed(element)).toBe(false);
            expect(getCount(element)).toBe('5');
            expect(element.classList.contains('is-loading')).toBe(false);
        });

        it('falls back to a generic message for unexpected errors', async () => {
            vi.mocked(toggleCommentLike).mockRejectedValue(new Error('boom'));
            const element = setup();

            element.click();
            await vi.waitFor((): void => expect(element.disabled).toBe(false));

            expect(showSnackbar).toHaveBeenCalledWith(
                'Something went wrong. Please try again.',
                'error',
            );
        });

        it('does not retry on its own, a new request needs a new click', async () => {
            vi.mocked(toggleCommentLike).mockRejectedValueOnce(
                new ApiError('Server error', HttpStatus.INTERNAL_SERVER_ERROR),
            );
            vi.mocked(toggleCommentLike).mockResolvedValueOnce({
                isLikedByCurrentUser: true,
                likesCount: 6,
            });
            const element = setup();

            element.click();
            await vi.waitFor((): void => expect(element.disabled).toBe(false));
            expect(toggleCommentLike).toHaveBeenCalledTimes(1);

            element.click();
            await vi.waitFor((): void => expect(isPressed(element)).toBe(true));
            expect(toggleCommentLike).toHaveBeenCalledTimes(2);
        });
    });
});
