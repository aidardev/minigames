import { getComments } from '@/api/comments';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { AppSession } from '@/services/session/session.types';
import type { Comment, GameComments } from '@/types/game-details.types';
import { AvatarColorPicker } from '@/utils/avatar-color';
import { formatRelativeDate } from '@/utils/date';
import { html, type SafeHtml } from '@/utils/html';
import { getInitial } from '@/utils/profile/profile';
import { CommentForm } from './comment-form';
import { CommentLikeButton } from './comment-like-button';

export interface CommentsSectionProperties extends GameComments {
    slug: string;
    session: AppSession | undefined;
}

export class CommentsSection extends BaseComponent<'section'> {
    private readonly slug: string;
    private readonly avatarColors = new AvatarColorPicker();
    private likeButtons: CommentLikeButton[] = [];

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
        for (const button of this.likeButtons) this.release(button);
        this.likeButtons = [];

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

        body.innerHTML = this.renderList(comments).value;
        this.mountLikeButtons(body, comments);
    }

    private updateTotal(total: number): void {
        this.getElement('[data-comments-title]').textContent = `Comments (${total})`;
    }

    private mountLikeButtons(root: HTMLElement, comments: Comment[]): void {
        for (const slot of root.querySelectorAll<HTMLElement>('[data-like-slot]')) {
            const comment = comments.find(
                (item: Comment): boolean => item.commentId === slot.dataset.likeSlot,
            );
            if (!comment) continue;

            const button = this.adopt(
                new CommentLikeButton({
                    commentId: comment.commentId,
                    isLiked: comment.isLikedByCurrentUser,
                    likesCount: comment.likesCount,
                }),
            );
            this.likeButtons.push(button);
            slot.replaceWith(button.element);
        }
    }

    private renderList(comments: Comment[]): SafeHtml {
        return html`
            <ul class="game-details__comments-list list-unstyled">
                ${comments.map((comment: Comment): SafeHtml => this.renderComment(comment))}
            </ul>
        `;
    }

    private renderComment(comment: Comment): SafeHtml {
        return html`
            <li class="game-details__comment">
                <article class="comment">
                    <header class="comment__header">
                        <div class="comment__author">
                            <span
                                class="comment__avatar avatar comment__avatar--color-${this.avatarColors.getIndex(comment.authorName)}"
                                aria-hidden="true"
                            >
                                ${getInitial(comment.authorName)}
                            </span>

                            <h4 class="comment__name">${comment.authorName}</h4>
                        </div>
                        <time class="comment__date" datetime="${comment.createdAt}">
                            ${formatRelativeDate(comment.createdAt)}
                        </time>
                    </header>

                    <p class="comment__text">${comment.text}</p>

                    <span data-like-slot="${comment.commentId}"></span>
                </article>
            </li>
        `;
    }
}
