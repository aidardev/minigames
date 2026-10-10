// @vitest-environment jsdom

import { ApiError } from '@/api/api-error';
import { postComment } from '@/api/comments';
import { requireSession } from '@/app/require-auth';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { AppSession } from '@/services/session/session.types';
import type { Comment } from '@/types/game-details.types';
import { HttpStatus } from '@/utils/status-codes';
import { toRem } from '@/utils/to-rem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentForm, getCommentError } from './comment-form';

vi.mock('@/api/comments', () => ({ postComment: vi.fn() }));
vi.mock('@/app/require-auth', () => ({ requireSession: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const SLUG = 'cat-mail-co';
const MAX_LENGTH = 500;
const MAX_HEIGHT_PX = 88;
const SESSION: AppSession = {
    displayName: 'alex',
    email: 'alex@minigames.com',
    authenticatedAt: 1,
};
const CREATED: Comment = {
    commentId: '1',
    authorName: 'alex',
    text: 'Great game',
    likesCount: 0,
    isLikedByCurrentUser: false,
    createdAt: '2026-01-01T00:00:00Z',
};

function createDeferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>();
}

function query<T extends Element>(root: Element, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);

    return element;
}

function pressEnter(input: HTMLTextAreaElement, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        ...init,
    });
    input.dispatchEvent(event);

    return event;
}

function mockScrollHeight(input: HTMLTextAreaElement, value: number): void {
    // jsdom has no layout, so scrollHeight is always 0 unless it is faked.
    Object.defineProperty(input, 'scrollHeight', { value, configurable: true });
}

interface TestContext {
    element: HTMLFormElement;
    input: HTMLTextAreaElement;
    button: HTMLButtonElement;
    onPosted: ReturnType<typeof vi.fn<(session: AppSession) => Promise<void>>>;
}

function setup({ isGuest = false }: { isGuest?: boolean } = {}): TestContext {
    const session = isGuest ? undefined : SESSION;
    const onPosted = vi.fn<(session: AppSession) => Promise<void>>().mockResolvedValue();
    const { element } = new CommentForm({ slug: SLUG, session, onPosted });

    // jsdom submits a form by a button click only while it is connected to the document.
    document.body.append(element);

    return {
        element,
        input: query<HTMLTextAreaElement>(element, 'textarea'),
        button: query<HTMLButtonElement>(element, '.comment-form__submit'),
        onPosted,
    };
}

describe('getCommentError', () => {
    it('rejects an empty text', () => {
        expect(getCommentError('')).toBeDefined();
    });

    it('accepts a single character', () => {
        expect(getCommentError('a')).toBeUndefined();
    });

    it('accepts a text of exactly the maximum length', () => {
        expect(getCommentError('a'.repeat(MAX_LENGTH))).toBeUndefined();
    });

    it('rejects a text over the maximum length', () => {
        expect(getCommentError('a'.repeat(MAX_LENGTH + 1))).toBeDefined();
    });

    it('mentions the limit in the too-long message', () => {
        expect(getCommentError('a'.repeat(MAX_LENGTH + 1))).toContain(String(MAX_LENGTH));
    });
});

describe('CommentForm', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requireSession).mockReturnValue(SESSION);
        vi.mocked(postComment).mockResolvedValue(CREATED);
    });

    afterEach(() => {
        document.body.replaceChildren();
    });

    describe('initial state', () => {
        it('starts with an empty, enabled textarea for an authenticated user', () => {
            const { input, button } = setup();

            expect(input.value).toBe('');
            expect(input.disabled).toBe(false);
            expect(button.disabled).toBe(false);
        });

        it('shows the uppercase first letter of the username in the avatar', () => {
            const { element } = setup();

            expect(query(element, '.comment-form__avatar').textContent?.trim()).toBe('A');
        });

        it('locks the form and shows a sign-in placeholder for a guest', () => {
            const { element, input, button } = setup({ isGuest: true });

            expect(input.disabled).toBe(true);
            expect(button.disabled).toBe(true);
            expect(input.placeholder).toContain('Sign in');
            expect(query(element, '.comment-form__avatar').textContent?.trim()).toBe('U');
        });
    });

    describe('auto-expanding textarea', () => {
        it('grows with the content', () => {
            const { input } = setup();
            mockScrollHeight(input, 60);

            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(input.style.height).toBe(toRem(60));
        });

        it('stops growing at the maximum height', () => {
            const { input } = setup();
            mockScrollHeight(input, 300);

            input.dispatchEvent(new Event('input', { bubbles: true }));

            expect(input.style.height).toBe(toRem(MAX_HEIGHT_PX));
        });

        it('shrinks back after the text is cleared by a successful send', async () => {
            const { input, onPosted } = setup();
            mockScrollHeight(input, 60);
            input.value = 'Great game';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            mockScrollHeight(input, 24);

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(input.style.height).toBe(toRem(24));
        });
    });

    describe('submission', () => {
        it('submits with Enter and prevents the new line', async () => {
            const { input, onPosted } = setup();
            input.value = 'Great game';

            const event = pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(event.defaultPrevented).toBe(true);
            expect(postComment).toHaveBeenCalledOnce();
        });

        it('submits with the Send button', async () => {
            const { input, button, onPosted } = setup();
            input.value = 'Great game';

            button.click();
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(postComment).toHaveBeenCalledOnce();
        });

        it('does not submit on Shift+Enter and leaves the new line to the browser', () => {
            const { input } = setup();
            input.value = 'Great game';

            const event = pressEnter(input, { shiftKey: true });

            expect(event.defaultPrevented).toBe(false);
            expect(postComment).not.toHaveBeenCalled();
        });

        it('does not submit on Enter during an IME composition', () => {
            const { input } = setup();
            input.value = 'Great game';

            pressEnter(input, { isComposing: true });

            expect(postComment).not.toHaveBeenCalled();
        });

        it('ignores keys other than Enter', () => {
            const { input } = setup();
            input.value = 'Great game';

            pressEnter(input, { key: 'a' });

            expect(postComment).not.toHaveBeenCalled();
        });

        it('sends the trimmed text with the identity from the session', async () => {
            const { input, onPosted } = setup();
            input.value = '  Great game  ';

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(postComment).toHaveBeenCalledWith(SLUG, {
                userEmail: 'alex@minigames.com',
                authorName: 'alex',
                text: 'Great game',
            });
        });

        it('clears the textarea and reports the session through onPosted', async () => {
            const { input, onPosted } = setup();
            input.value = 'Great game';

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(input.value).toBe('');
            expect(onPosted).toHaveBeenCalledWith(SESSION);
        });
    });

    describe('locking', () => {
        it('locks the textarea and the button while the request is pending', async () => {
            const request = createDeferred<Comment>();
            vi.mocked(postComment).mockReturnValue(request.promise);
            const { element, input, button } = setup();
            input.value = 'Great game';

            pressEnter(input);

            expect(input.disabled).toBe(true);
            expect(button.disabled).toBe(true);
            expect(element.getAttribute('aria-busy')).toBe('true');

            request.resolve(CREATED);
            await vi.waitFor((): void => expect(input.disabled).toBe(false));

            expect(button.disabled).toBe(false);
            expect(element.getAttribute('aria-busy')).toBe('false');
        });

        it('does not send a second request while the first one is pending', async () => {
            const request = createDeferred<Comment>();
            vi.mocked(postComment).mockReturnValue(request.promise);
            const { input } = setup();
            input.value = 'Great game';

            pressEnter(input);
            pressEnter(input);
            pressEnter(input);

            expect(postComment).toHaveBeenCalledOnce();

            request.resolve(CREATED);
            await vi.waitFor((): void => expect(input.disabled).toBe(false));
        });

        it('stays locked until onPosted (the list refresh) is finished', async () => {
            const refresh = createDeferred<void>();
            const { input, onPosted } = setup();
            onPosted.mockReturnValue(refresh.promise);
            input.value = 'Great game';

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(input.disabled).toBe(true);

            refresh.resolve();
            await vi.waitFor((): void => expect(input.disabled).toBe(false));
        });
    });

    describe('validation', () => {
        it.each([
            ['empty', ''],
            ['whitespace only', '   \n  '],
            ['over the limit', 'a'.repeat(MAX_LENGTH + 1)],
        ])('rejects %s text: one warning, no request, text is kept', (_case, value) => {
            const { input, button } = setup();
            input.value = value;

            pressEnter(input);

            expect(postComment).not.toHaveBeenCalled();
            expect(showSnackbar).toHaveBeenCalledOnce();
            expect(showSnackbar).toHaveBeenCalledWith(expect.any(String), 'warning');
            expect(input.value).toBe(value);
            expect(input.disabled).toBe(false);
            expect(button.disabled).toBe(false);
        });

        it('counts the limit after trimming, not before', async () => {
            const { input, onPosted } = setup();
            input.value = `  ${'a'.repeat(MAX_LENGTH)}  `;

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(postComment).toHaveBeenCalledOnce();
        });
    });

    describe('access control', () => {
        it('sends nothing and keeps the text when the session has expired', () => {
            vi.mocked(requireSession).mockReturnValue(undefined);
            const { input } = setup();
            input.value = 'Great game';

            pressEnter(input);

            expect(postComment).not.toHaveBeenCalled();
            expect(input.value).toBe('Great game');
            expect(input.disabled).toBe(false);
        });
    });

    describe('request failure', () => {
        it('shows the server message, keeps the text and unlocks the form', async () => {
            vi.mocked(postComment).mockRejectedValue(
                new ApiError('Text is not allowed', HttpStatus.BAD_REQUEST),
            );
            const { input, button, onPosted } = setup();
            input.value = 'Great game';

            pressEnter(input);
            await vi.waitFor((): void => expect(input.disabled).toBe(false));

            expect(showSnackbar).toHaveBeenCalledOnce();
            expect(showSnackbar).toHaveBeenCalledWith('Text is not allowed', 'error');
            expect(input.value).toBe('Great game');
            expect(button.disabled).toBe(false);
            expect(onPosted).not.toHaveBeenCalled();
        });

        it('falls back to a generic message for unexpected errors', async () => {
            vi.mocked(postComment).mockRejectedValue(new Error('boom'));
            const { input } = setup();
            input.value = 'Great game';

            pressEnter(input);
            await vi.waitFor((): void => expect(input.disabled).toBe(false));

            expect(showSnackbar).toHaveBeenCalledWith(
                'Something went wrong. Please try again.',
                'error',
            );
        });

        it('does not retry on its own, a new request needs a new submit', async () => {
            vi.mocked(postComment).mockRejectedValueOnce(
                new ApiError('Server error', HttpStatus.INTERNAL_SERVER_ERROR),
            );
            const { input, onPosted } = setup();
            input.value = 'Great game';

            pressEnter(input);
            await vi.waitFor((): void => expect(input.disabled).toBe(false));
            expect(postComment).toHaveBeenCalledTimes(1);

            pressEnter(input);
            await vi.waitFor((): void => expect(onPosted).toHaveBeenCalledOnce());

            expect(postComment).toHaveBeenCalledTimes(2);
            expect(input.value).toBe('');
        });
    });
});
