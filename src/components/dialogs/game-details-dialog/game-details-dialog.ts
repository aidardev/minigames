import closeIcon from '@/assets/icons/close-alt.svg?raw';
import heartIcon from '@/assets/icons/favorite.svg?raw';
import sendIcon from '@/assets/icons/send.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import type { Comment, GameDetails, TopRecord } from '@/types/game-details.types';
import { formatRelativeDate } from '@/utils/date';
import { formatCompactNumber } from '@/utils/formatters';
import { Dialog } from '../dialog';
import './game-details-dialog.scss';

export interface GameDetailsDialogProperties {
    game: GameDetails;
    comments: Comment[];
}

export class GameDetailsDialog extends Dialog {
    private readonly game: GameDetails;
    private readonly comments: Comment[];

    private isFavorite: boolean;
    private readonly likedComments = new Set<string>();

    private handleActionClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        const action = event.target.closest<HTMLElement>('[data-action]');
        if (!action) return;

        switch (action.dataset.action) {
            case 'close': {
                this.close();
                break;
            }

            case 'favorite': {
                this.toggleFavorite();
                break;
            }

            case 'like-comment': {
                this.toggleCommentLike(action);
                break;
            }

            case 'play': {
                break;
            }

            default: {
                break;
            }
        }
    };

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

    constructor({ game, comments }: GameDetailsDialogProperties) {
        super({
            label: 'Game Details',
            modifier: 'dialog--game-details',
        });

        this.game = game;
        this.comments = comments.map((comment): Comment => ({ ...comment }));

        this.isFavorite = game.isLikedByCurrentUser;

        for (const comment of this.comments) {
            if (comment.isLikedByCurrentUser) {
                this.likedComments.add(comment.commentId);
            }
        }

        this.render();
        this.updateFavoriteButton();
        this.bindGameDetailsEvents();
    }

    private render(): void {
        this.setContent(/* HTML */ `
            <article class="game-details">
                ${this.renderHero()}
                <div class="game-details__body">
                    ${this.renderInfo()} ${this.renderRecords()} ${this.renderComments()}
                </div>
            </article>
        `);
    }

    private renderHero(): string {
        return /* HTML */ `
            <header class="game-details__hero">
                <img
                    class="game-details__hero-img img-responsive"
                    src="${this.game.heroImage}"
                    alt="${this.game.name}"
                >
                <button
                    class="game-details__close dialog__close btn btn--icon"
                    type="button"
                    data-action="close"
                    aria-label="Close game details"
                >
                    ${closeIcon}
                </button>
            </header>
        `;
    }

    private renderInfo(): string {
        const { specs } = this.game;

        return /* HTML */ `
            <section class="game-details__info">
                <header class="game-details__info-header">
                    <div class="game-details__title-row">
                        <h2 class="game-details__title">${this.game.name}</h2>
                        <div class="game-details__meta">
                            <div class="game-details__meta-item meta-item meta-item--rating">
                                ${starIcon}
                                <span class="meta-item__value">${this.game.rating}</span>
                            </div>
                            <div class="game-details__meta-item meta-item meta-item--likes">
                                ${heartIcon}
                                <span class="meta-item__value"
                                    >${formatCompactNumber(this.game.likesCount)}</span
                                >
                            </div>
                        </div>
                    </div>
                    <p class="game-details__description">${this.game.fullDescription}</p>
                </header>

                <dl class="game-details__specs">
                    ${this.renderSpec('Genre', specs.genre)}
                    ${this.renderSpec('Players', specs.players)}
                    ${this.renderSpec('Duration', specs.duration)}
                    ${this.renderSpec('Price', specs.price)}
                </dl>

                <div class="game-details__actions">
                    <button
                        class="game-details__play btn btn--large btn--primary"
                        type="button"
                        data-action="play"
                    >
                        Play Now
                    </button>
                    <button
                        class="game-details__favorite btn btn--large"
                        type="button"
                        data-action="favorite"
                        aria-pressed="${this.isFavorite}"
                    >
                        ${heartIcon}
                        <span data-favorite-label>
                            ${this.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </span>
                    </button>
                </div>
            </section>
        `;
    }

    private updateFavoriteButton(): void {
        const button = this.query<HTMLButtonElement>('[data-action="favorite"]');
        if (!button) return;

        button.setAttribute('aria-pressed', String(this.isFavorite));
        button.classList.toggle('is-active', this.isFavorite);

        const label = button.querySelector<HTMLElement>('[data-favorite-label]');
        if (label) {
            label.textContent = this.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        }
    }

    private renderSpec(label: string, value: string): string {
        return /* HTML */ `
            <div class="game-details__spec spec">
                <dt class="spec__label">${label}</dt>
                <dd class="spec__value">${value}</dd>
            </div>
        `;
    }

    private renderRecords(): string {
        return /* HTML */ `
            <section class="game-details__records">
                <h3 class="game-details__section-title">
                    <span aria-hidden="true">🏆</span>
                    Top Records
                </h3>
                <ol class="game-details__records-list list-unstyled">
                    ${this.game.topRecords.map((record): string => this.renderRecord(record)).join('')}
                </ol>
            </section>
        `;
    }

    private renderRecord(record: TopRecord): string {
        return /* HTML */ `
            <li class="game-details__record record">
                <span class="record__position" aria-label="Position ${record.position}">
                    ${this.getMedal(record.position)}
                </span>
                <span class="record__player">${record.playerName}</span>
                <strong class="record__score">${record.score.toLocaleString('en-US')} pts</strong>
                <time class="record__date" datetime="${record.achievedAt}">
                    ${formatRelativeDate(record.achievedAt)}
                </time>
            </li>
        `;
    }

    private renderComments(): string {
        return /* HTML */ `
            <section class="game-details__comments">
                <h3 class="game-details__section-title">Comments (${this.comments.length})</h3>

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
                        placeholder="Write a comment..."
                        data-comment-input
                    ></textarea>
                    <button
                        class="comment-form__submit btn btn--icon btn--on-primary"
                        type="submit"
                        aria-label="Submit comment"
                    >
                        ${sendIcon}
                    </button>
                </form>

                <ul class="game-details__comments-list list-unstyled">
                    ${this.comments.map((comment): string => this.renderComment(comment)).join('')}
                </ul>
            </section>
        `;
    }

    private renderComment(comment: Comment): string {
        const isLiked = this.likedComments.has(comment.commentId);

        return /* HTML */ `
            <li class="game-details__comment">
                <article class="comment">
                    <header class="comment__header">
                        <div class="comment__author">
                            <span class="comment__avatar avatar" aria-hidden="true">
                                ${comment.authorName.charAt(0).toUpperCase()}
                            </span>

                            <strong class="comment__name"> ${comment.authorName} </strong>
                        </div>
                        <time class="comment__date" datetime="${comment.createdAt}">
                            ${formatRelativeDate(comment.createdAt)}
                        </time>
                    </header>

                    <p class="comment__text">${comment.text}</p>

                    <button
                        class="comment__like btn"
                        type="button"
                        data-action="like-comment"
                        data-comment-id="${comment.commentId}"
                        aria-pressed="${isLiked}"
                        aria-label="${isLiked ? 'Unlike' : 'Like'} comment"
                    >
                        ${heartIcon}
                        <span data-comment-like-count>
                            ${comment.likesCount + (isLiked ? 1 : 0)}
                        </span>
                    </button>
                </article>
            </li>
        `;
    }

    private bindGameDetailsEvents(): void {
        this.element.addEventListener('click', this.handleActionClick);
        this.element.addEventListener('submit', this.handleSubmit);
        this.element.addEventListener('input', this.handleInput);
    }

    private toggleFavorite(): void {
        this.isFavorite = !this.isFavorite;
        this.updateFavoriteButton();
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

        const comment = this.comments.find((item): boolean => item.commentId === commentId);
        if (!comment) return;

        const count = comment.likesCount + (isLiked ? 0 : 1);
        const countElement = button.querySelector<HTMLElement>('[data-comment-like-count]');
        if (countElement) {
            countElement.textContent = String(count);
        }
    }

    private resizeTextarea(textarea: HTMLTextAreaElement): void {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 88)}px`;
    }

    private getMedal(position: number): string {
        switch (position) {
            case 1: {
                return '🥇';
            }
            case 2: {
                return '🥈';
            }
            case 3: {
                return '🥉';
            }
            default: {
                return String(position);
            }
        }
    }
}
