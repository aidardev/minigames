import heartIcon from '@/assets/icons/favorite.svg?raw';
import sendIcon from '@/assets/icons/send.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import type { Comment, GameComments } from '@/types/game-details.types';
import { formatRelativeDate } from '@/utils/date';
import { html, type SafeHtml, unsafeHtml } from '@/utils/html';
import { toRem } from '@/utils/to-rem';

export class CommentsSection extends BaseComponent<'section'> {
    private readonly likedComments = new Set<string>();
    private readonly comments: Comment[];

    private handleSubmit = (event: SubmitEvent): void => {
        const form = event.target;

        if (!(form instanceof HTMLFormElement)) return;
        if (!form.matches('[data-comment-form]')) return;

        event.preventDefault();
    };

    private handleInput = (event: Event): void => {
        const target = event.target;

        if (!(target instanceof HTMLTextAreaElement)) return;
        if (!target.matches('[data-comment-input]')) return;

        this.resizeTextarea(target);
    };

    private handleActionClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        const action = event.target.closest<HTMLElement>('[data-action="like-comment"]');
        if (action) {
            this.toggleCommentLike(action);
        }
    };

    constructor({ comments, total }: GameComments) {
        super('section', 'game-details__comments');

        this.comments = comments;

        for (const comment of comments) {
            if (comment.isLikedByCurrentUser) {
                this.likedComments.add(comment.commentId);
            }
        }

        this.setHtml(html`
            <h3 class="game-details__section-title">Comments (${total})</h3>

            <form class="game-details__comment-form comment-form" data-comment-form>
                <div class="comment-form__avatar avatar" aria-hidden="true">U</div>
                <label class="comment-form__label sr-only" for="game-details-comment">
                    Write a comment
                </label>
                <textarea
                    id="game-details-comment"
                    class="comment-form__input"
                    name="comment"
                    rows="1"
                    maxlength="1000"
                    placeholder="Sign in to write a comment"
                    data-comment-input
                    disabled
                ></textarea>
                <button
                    class="comment-form__submit btn btn--icon btn--on-primary"
                    type="submit"
                    aria-label="Submit comment"
                    disabled
                >
                    ${unsafeHtml(sendIcon)}
                </button>
            </form>

            ${
                comments.length > 0
                    ? html`
                          <ul class="game-details__comments-list list-unstyled">
                              ${comments.map((comment: Comment): SafeHtml => this.renderComment(comment))}
                          </ul>
                      `
                    : html`<div data-comments-empty></div>`
            }
        `);

        if (comments.length === 0) {
            this.query('[data-comments-empty]')?.replaceWith(
                this.adopt(
                    new EmptyState({
                        title: 'No comments yet',
                        description: 'Comments will appear here.',
                    }),
                ).element,
            );
        }

        this.element.addEventListener('click', this.handleActionClick);
        this.element.addEventListener('submit', this.handleSubmit);
        this.element.addEventListener('input', this.handleInput);
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

    private resizeTextarea(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        textarea.style.height = toRem(Math.min(textarea.scrollHeight, 88));
    }
}
