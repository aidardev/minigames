import { getErrorMessage } from '@/api/api-error';
import { toggleCommentLike } from '@/api/comments';
import { requireSession } from '@/app/require-auth';
import heartIcon from '@/assets/icons/favorite.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { html, unsafeHtml } from '@/utils/html';

const GUEST_MESSAGE = 'Sign in to like comments.';

export interface CommentLikeButtonProperties {
    commentId: string;
    isLiked: boolean;
    likesCount: number;
}

export class CommentLikeButton extends BaseComponent<'button'> {
    private readonly commentId: string;
    private isLiked: boolean;
    private likesCount: number;
    private isPending = false;

    private readonly handleClick = (): void => {
        void this.toggle();
    };

    constructor({ commentId, isLiked, likesCount }: CommentLikeButtonProperties) {
        super('button', 'comment__like btn');

        this.commentId = commentId;
        this.isLiked = isLiked;
        this.likesCount = likesCount;

        this.element.type = 'button';
        this.setHtml(html`${unsafeHtml(heartIcon)}<span data-like-count></span>`);

        this.element.addEventListener('click', this.handleClick);
        this.render();
    }

    private render(): void {
        this.element.setAttribute('aria-pressed', String(this.isLiked));
        this.element.setAttribute('aria-label', this.isLiked ? 'Unlike comment' : 'Like comment');
        this.element.classList.toggle('is-active', this.isLiked);

        this.getElement('[data-like-count]').textContent = String(this.likesCount);
    }

    private setPending(isPending: boolean): void {
        this.isPending = isPending;
        this.element.disabled = isPending;
        this.element.classList.toggle('is-loading', isPending);
        this.element.setAttribute('aria-busy', String(isPending));
    }

    private async toggle(): Promise<void> {
        if (this.isPending) return;

        const session = requireSession(GUEST_MESSAGE);
        if (!session) return;

        this.setPending(true);

        try {
            const state = await toggleCommentLike(this.commentId, session.email);

            this.isLiked = state.isLikedByCurrentUser;
            this.likesCount = state.likesCount;
            this.render();
        } catch (error) {
            showSnackbar(getErrorMessage(error), 'error');
        } finally {
            this.setPending(false);
        }
    }
}
