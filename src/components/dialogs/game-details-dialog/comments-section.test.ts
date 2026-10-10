// @vitest-environment jsdom

import { getComments, postComment, toggleCommentLike } from '@/api/comments';
import { requireSession } from '@/app/require-auth';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { AppSession } from '@/services/session/session.types';
import type { Comment } from '@/types/game-details.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsSection } from './comments-section';

vi.mock('@/api/comments', () => ({
    getComments: vi.fn(),
    postComment: vi.fn(),
    toggleCommentLike: vi.fn(),
}));
vi.mock('@/app/require-auth', () => ({ requireSession: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const SLUG = 'cat-mail-co';
const SESSION: AppSession = {
    displayName: 'Alex',
    email: 'alex@minigames.com',
    authenticatedAt: 1,
};

function createComment(commentId: string, text: string, isLiked = false): Comment {
    return {
        commentId,
        authorName: 'bob',
        text,
        likesCount: 0,
        isLikedByCurrentUser: isLiked,
        createdAt: '2026-01-01T00:00:00Z',
    };
}

function setup(
    comments: Comment[],
    total: number,
    { isGuest = false }: { isGuest?: boolean } = {},
): HTMLElement {
    const session = isGuest ? undefined : SESSION;
    const { element } = new CommentsSection({ slug: SLUG, session, comments, total });
    document.body.append(element);

    return element;
}

function query<T extends Element>(root: Element, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);

    return element;
}

function getTitle(root: Element): string | null | undefined {
    return query(root, '[data-comments-title]').textContent;
}

function getRenderedTexts(root: Element): (string | undefined)[] {
    return [...root.querySelectorAll('.comment__text')].map((node) => node.textContent?.trim());
}

function sendComment(root: HTMLElement, text: string): void {
    const input = query<HTMLTextAreaElement>(root, 'textarea');
    input.value = text;
    input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
}

describe('CommentsSection', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requireSession).mockReturnValue(SESSION);
    });

    afterEach(() => {
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });

    describe('rendering', () => {
        it('shows the total from the server, not the number of loaded comments', () => {
            const element = setup([createComment('1', 'Nice')], 12);

            expect(getTitle(element)).toBe('Comments (12)');
            expect(element.querySelectorAll('.comment')).toHaveLength(1);
        });

        it('renders every loaded comment', () => {
            const element = setup([createComment('1', 'First'), createComment('2', 'Second')], 2);

            expect(getRenderedTexts(element)).toStrictEqual(['First', 'Second']);
        });

        it('renders comment text as text, never as HTML', () => {
            const malicious = '<img src=x onerror=alert(1)>';
            const element = setup([createComment('1', malicious)], 1);

            expect(element.querySelector(':scope .comment__text img')).toBeNull();
            expect(query(element, '.comment__text').textContent?.trim()).toBe(malicious);
        });

        it('shows the first letter of the commenter name in uppercase', () => {
            const element = setup([createComment('1', 'Nice')], 1);

            expect(query(element, '.comment__avatar').textContent?.trim()).toBe('B');
        });

        it('marks comments liked by the current user as active', () => {
            const element = setup([createComment('1', 'Nice', true)], 1);
            const like = query(element, '.comment__like');

            expect(like.getAttribute('aria-pressed')).toBe('true');
            expect(like.classList.contains('is-active')).toBe(true);
        });

        it('shows an empty state instead of a list when there are no comments', () => {
            const element = setup([], 0);

            expect(getTitle(element)).toBe('Comments (0)');
            expect(element.textContent).toContain('No comments yet');
            expect(element.querySelector('.game-details__comments-list')).toBeNull();
        });

        it('shows the like count from the server without adding to it', () => {
            const comment = { ...createComment('1', 'Nice', true), likesCount: 7 };
            const element = setup([comment], 1);

            expect(query(element, '.comment__like').textContent?.trim()).toBe('7');
        });

        it('updates a like button from the server response', async () => {
            vi.mocked(toggleCommentLike).mockResolvedValue({
                isLikedByCurrentUser: true,
                likesCount: 1,
            });
            const element = setup([createComment('1', 'Nice')], 1);
            const like = query<HTMLButtonElement>(element, '.comment__like');

            like.click();
            await vi.waitFor((): void => expect(like.getAttribute('aria-pressed')).toBe('true'));

            expect(toggleCommentLike).toHaveBeenCalledWith('1', 'alex@minigames.com');
            expect(like.textContent?.trim()).toBe('1');
        });

        it('uses the first non-whitespace character of the author name in uppercase', () => {
            const comment = { ...createComment('1', 'Nice'), authorName: '  bob' };
            const element = setup([comment], 1);

            expect(query(element, '.comment__avatar').textContent?.trim()).toBe('B');
        });

        it('gives the avatar a color class from the token range', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const element = setup([createComment('1', 'Nice')], 1);

            expect(query(element, '.comment__avatar').classList).toContain(
                'comment__avatar--color-3',
            );
        });

        it('gives the same color to the same author within one list', () => {
            vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.999);
            const element = setup([createComment('1', 'One'), createComment('2', 'Two')], 2);
            const [first, second] = element.querySelectorAll('.comment__avatar');

            expect(first?.className).toBe(second?.className);
        });
    });

    describe('comment form', () => {
        it('is enabled for an authenticated user', () => {
            const element = setup([], 0);

            expect(query<HTMLTextAreaElement>(element, 'textarea').disabled).toBe(false);
        });

        it('is locked for a guest', () => {
            const element = setup([], 0, { isGuest: true });

            expect(query<HTMLTextAreaElement>(element, 'textarea').disabled).toBe(true);
            expect(query<HTMLButtonElement>(element, '.comment-form__submit').disabled).toBe(true);
        });
    });

    describe('refresh after posting', () => {
        it('replaces the list and the total with the fresh server data', async () => {
            vi.mocked(postComment).mockResolvedValue(createComment('9', 'Hi'));
            vi.mocked(getComments).mockResolvedValue({
                comments: [createComment('9', 'Hi'), createComment('1', 'Old')],
                total: 4,
            });
            const element = setup([createComment('1', 'Old')], 3);

            sendComment(element, 'Hi');
            await vi.waitFor((): void => expect(getTitle(element)).toBe('Comments (4)'));

            expect(getRenderedTexts(element)).toStrictEqual(['Hi', 'Old']);
        });

        it('requests the list for the slug and the email of the posting user', async () => {
            vi.mocked(postComment).mockResolvedValue(createComment('9', 'Hi'));
            vi.mocked(getComments).mockResolvedValue({
                comments: [createComment('9', 'Hi')],
                total: 1,
            });
            const element = setup([], 0);

            sendComment(element, 'Hi');
            await vi.waitFor((): void => expect(getComments).toHaveBeenCalledOnce());

            expect(getComments).toHaveBeenCalledWith(SLUG, { userEmail: 'alex@minigames.com' });
        });

        it('replaces the empty state once the first comment is posted', async () => {
            vi.mocked(postComment).mockResolvedValue(createComment('9', 'First'));
            vi.mocked(getComments).mockResolvedValue({
                comments: [createComment('9', 'First')],
                total: 1,
            });
            const element = setup([], 0);

            sendComment(element, 'First');
            await vi.waitFor((): void =>
                expect(element.querySelectorAll('.comment')).toHaveLength(1),
            );

            expect(element.textContent).not.toContain('No comments yet');
            expect(getTitle(element)).toBe('Comments (1)');
        });

        it('does not fetch the list when posting fails', async () => {
            vi.mocked(postComment).mockRejectedValue(new Error('boom'));
            const element = setup([createComment('1', 'Old')], 1);

            sendComment(element, 'Hi');
            await vi.waitFor((): void => expect(showSnackbar).toHaveBeenCalledOnce());

            expect(getComments).not.toHaveBeenCalled();
            expect(getRenderedTexts(element)).toStrictEqual(['Old']);
            expect(getTitle(element)).toBe('Comments (1)');
        });

        it('keeps the avatar color of an existing author after the list is refreshed', async () => {
            const random = vi.spyOn(Math, 'random').mockReturnValue(0);
            const element = setup([createComment('1', 'Old')], 1);
            random.mockReturnValue(0.999);
            vi.mocked(postComment).mockResolvedValue(createComment('9', 'Hi'));
            vi.mocked(getComments).mockResolvedValue({
                comments: [
                    { ...createComment('9', 'Hi'), authorName: 'carol' },
                    createComment('1', 'Old'),
                ],
                total: 2,
            });

            sendComment(element, 'Hi');
            await vi.waitFor((): void =>
                expect(element.querySelectorAll('.comment')).toHaveLength(2),
            );

            const [carol, bob] = element.querySelectorAll('.comment__avatar');

            expect(bob?.classList).toContain('comment__avatar--color-1');
            expect(carol?.classList).toContain('comment__avatar--color-5');
        });

        describe('when only the refresh fails', () => {
            it('warns that the comment was posted and keeps the old list', async () => {
                vi.mocked(postComment).mockResolvedValue(createComment('9', 'Hi'));
                vi.mocked(getComments).mockRejectedValue(new Error('network'));
                const element = setup([createComment('1', 'Old')], 3);

                sendComment(element, 'Hi');
                await vi.waitFor((): void => expect(showSnackbar).toHaveBeenCalledOnce());

                expect(showSnackbar).toHaveBeenCalledWith(
                    expect.stringContaining('was posted'),
                    'warning',
                );
                expect(getRenderedTexts(element)).toStrictEqual(['Old']);
                expect(getTitle(element)).toBe('Comments (3)');
            });

            it('clears the textarea and unlocks the form, so nothing gets sent twice', async () => {
                vi.mocked(postComment).mockResolvedValue(createComment('9', 'Hi'));
                vi.mocked(getComments).mockRejectedValue(new Error('network'));
                const element = setup([], 0);
                const input = query<HTMLTextAreaElement>(element, 'textarea');

                sendComment(element, 'Hi');
                await vi.waitFor((): void => expect(showSnackbar).toHaveBeenCalledOnce());
                await vi.waitFor((): void => expect(input.disabled).toBe(false));

                expect(input.value).toBe('');
                expect(postComment).toHaveBeenCalledOnce();
            });
        });
    });
});
