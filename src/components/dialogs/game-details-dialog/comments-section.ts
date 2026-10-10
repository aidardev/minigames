import { getComments } from '@/api/comments';
import heartIcon from '@/assets/icons/favorite.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { AppSession } from '@/services/session/session.types';
import type { Comment, GameComments } from '@/types/game-details.types';
import { formatRelativeDate } from '@/utils/date';
import { html, type SafeHtml, unsafeHtml } from '@/utils/html';
import { CommentForm } from './comment-form';

export interface CommentsSectionProperties extends GameComments {
    slug: string;
    session: AppSession | undefined;
}

export class CommentsSection extends BaseComponent<'section'> {
    private readonly slug: string;
    private readonly likedComments = new Set<string>();
    private comments: Comment[] = [];

    private handleActionClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        const action = event.target.closest<HTMLElement>('[data-action="like-comment"]');
        if (action) {
            this.toggleCommentLike(action);
        }
    };

    constructor({ slug, session, comments, total }: CommentsSectionProperties) {
        super('section', 'game-details__comments');

        this.slug = slug;

        this.setHtml(html`
            <h3 class="game-details__section-title" data-comments-title></h3>
            <div data-comment-form-slot></div>
            <div data-comments-slot></div>
        `);

        this.getElement('[data-comment-form-slot]').replaceWith(
            this.adopt(
                new CommentForm({
                    slug,
                    session,
                    onPosted: (activeSession: AppSession): Promise<void> =>
                        this.refresh(activeSession),
                }),
            ).element,
        );

        this.showComments({ comments, total });

        this.element.addEventListener('click', this.handleActionClick);
    }

    private async refresh(session: AppSession): Promise<void> {
        try {
            this.showComments(await getComments(this.slug, { userEmail: session.email }));
        } catch {
            showSnackbar(
                'Your comment was posted, but the list could not be refreshed. Reopen the game to see it.',
                'warning',
            );
        }
    }

    private showComments({ comments, total }: GameComments): void {
        this.comments = comments;
        this.likedComments.clear();

        for (const comment of comments) {
            if (comment.isLikedByCurrentUser) {
                this.likedComments.add(comment.commentId);
            }
        }

        this.updateTotal(total);

        const body = this.getElement('[data-comments-slot]');

        if (comments.length === 0) {
            body.replaceChildren(
                this.adopt(
                    new EmptyState({
                        title: 'No comments yet',
                        description: 'Comments will appear here.',
                    }),
                ).element,
            );
            return;
        }

        body.innerHTML = this.renderList().value;
    }

    private updateTotal(total: number): void {
        this.getElement('[data-comments-title]').textContent = `Comments (${total})`;
    }

    private renderList(): SafeHtml {
        return html`
            <ul class="game-details__comments-list list-unstyled">
                ${this.comments.map((comment: Comment): SafeHtml => this.renderComment(comment))}
            </ul>
        `;
    }

    private renderComment(comment: Comment): SafeHtml {
        const isLiked = this.likedComments.has(comment.commentId);

        return html`
            <li class="game-details__comment">
                <article class="comment">
                    <header class="comment__header">
                        <div class="comment__author">
                            <span class="comment__avatar avatar" aria-hidden="true">
                                ${comment.authorName.charAt(0).toUpperCase()}
                            </span>

                            <h4 class="comment__name">${comment.authorName}</h4>
                        </div>
                        <time class="comment__date" datetime="${comment.createdAt}">
                            ${formatRelativeDate(comment.createdAt)}
                        </time>
                    </header>

                    <p class="comment__text">${comment.text}</p>

                    <button
                        class="comment__like btn${isLiked ? ' is-active' : ''}"
                        type="button"
                        data-action="like-comment"
                        data-comment-id="${comment.commentId}"
                        aria-pressed="${String(isLiked)}"
                        aria-label="${isLiked ? 'Unlike' : 'Like'} comment"
                        disabled
                    >
                        ${unsafeHtml(heartIcon)}
                        <span data-comment-like-count>
                            ${comment.likesCount + (isLiked ? 1 : 0)}
                        </span>
                    </button>
                </article>
            </li>
        `;
    }

    private toggleCommentLike(button: HTMLElement): void {
        const commentId = button.dataset.commentId;
        if (!commentId) return;

        const isLiked = this.likedComments.has(commentId);
        if (isLiked) {
            this.likedComments.delete(commentId);
        } else {
            this.likedComments.add(commentId);
        }

        button.setAttribute('aria-pressed', String(!isLiked));
        button.setAttribute('aria-label', isLiked ? 'Like comment' : 'Unlike comment');
        button.classList.toggle('is-active', !isLiked);

        const comment = this.comments.find(
            (item: Comment): boolean => item.commentId === commentId,
        );
        if (!comment) return;

        const count = comment.likesCount + (isLiked ? 0 : 1);
        const countElement = button.querySelector<HTMLElement>('[data-comment-like-count]');
        if (countElement) {
            countElement.textContent = String(count);
        }
    }
}
