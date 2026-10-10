import { getErrorMessage } from '@/api/api-error';
import { postComment } from '@/api/comments';
import { requireSession } from '@/app/require-auth';
import sendIcon from '@/assets/icons/send.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { AppSession } from '@/services/session/session.types';
import { html, unsafeHtml } from '@/utils/html';
import { getInitial } from '@/utils/profile/profile';
import { toRem } from '@/utils/to-rem';

const MAX_COMMENT_LENGTH = 500;
const MAX_TEXTAREA_HEIGHT = 88;
const GUEST_MESSAGE = 'Sign in to write a comment.';

export function getCommentError(text: string): string | undefined {
    if (text.length === 0) return 'Write a comment before sending.';
    if (text.length > MAX_COMMENT_LENGTH) {
        return `Comment is too long. The maximum is ${MAX_COMMENT_LENGTH} characters.`;
    }

    return undefined;
}

export interface CommentFormProperties {
    slug: string;
    session: AppSession | undefined;
    onPosted: (session: AppSession) => Promise<void>;
}

export class CommentForm extends BaseComponent<'form'> {
    private readonly slug: string;
    private readonly onPosted: (session: AppSession) => Promise<void>;
    private readonly input: HTMLTextAreaElement;
    private readonly submitButton: HTMLButtonElement;
    private isPending = false;

    private readonly handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault();
        void this.submit();
    };

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        // Shift+Enter is a new line; Enter during IME composition confirms the character.
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;

        event.preventDefault();
        void this.submit();
    };

    private readonly handleInput = (): void => {
        this.resize();
    };

    constructor({ slug, session, onPosted }: CommentFormProperties) {
        super('form', 'game-details__comment-form comment-form');

        this.slug = slug;
        this.onPosted = onPosted;

        const isGuest = session === undefined;

        this.setHtml(html`
            <div class="comment-form__avatar avatar" aria-hidden="true">
                ${session ? getInitial(session.displayName) : 'U'}
            </div>
            <label class="comment-form__label sr-only" for="game-details-comment">
                Write a comment
            </label>
            <textarea
                id="game-details-comment"
                class="comment-form__input"
                name="comment"
                rows="1"
                autocomplete="off"
                placeholder="${isGuest ? 'Sign in to write a comment' : 'Write a comment...'}"
                data-comment-input
            ></textarea>
            <button
                class="comment-form__submit btn btn--icon btn--on-primary"
                type="submit"
                aria-label="Submit comment"
            >
                ${unsafeHtml(sendIcon)}
            </button>
        `);

        this.input = this.getElement<HTMLTextAreaElement>('[data-comment-input]');
        this.submitButton = this.getElement<HTMLButtonElement>('.comment-form__submit');
        this.input.disabled = isGuest;
        this.submitButton.disabled = isGuest;

        this.element.addEventListener('submit', this.handleSubmit);
        this.input.addEventListener('keydown', this.handleKeyDown);
        this.input.addEventListener('input', this.handleInput);
    }

    private resize(): void {
        this.input.style.height = 'auto';
        this.input.style.height = toRem(Math.min(this.input.scrollHeight, MAX_TEXTAREA_HEIGHT));
    }

    private setPending(isPending: boolean): void {
        this.isPending = isPending;
        this.input.disabled = isPending;
        this.submitButton.disabled = isPending;
        this.element.setAttribute('aria-busy', String(isPending));
    }

    private async post(session: AppSession, text: string): Promise<boolean> {
        try {
            await postComment(this.slug, {
                userEmail: session.email,
                authorName: session.displayName,
                text,
            });
        } catch (error) {
            showSnackbar(getErrorMessage(error), 'error');

            return false;
        }

        this.input.value = '';
        this.resize();

        return true;
    }

    private async submit(): Promise<void> {
        if (this.isPending) return;

        const session = requireSession(GUEST_MESSAGE);
        if (!session) return;

        const text = this.input.value.trim();
        const error = getCommentError(text);

        if (error) {
            showSnackbar(error, 'warning');
            return;
        }

        this.setPending(true);

        try {
            if (await this.post(session, text)) await this.onPosted(session);
        } finally {
            this.setPending(false);
            this.input.focus();
        }
    }
}
