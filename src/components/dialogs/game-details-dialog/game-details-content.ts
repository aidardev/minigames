import heartIcon from '@/assets/icons/favorite.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import { BaseComponent } from '@/components/base-component';
import type { GameDetails, TopRecord } from '@/types/game-details.types';
import { formatRelativeDate } from '@/utils/date';
import { formatCompactNumber } from '@/utils/formatters';
import { html, unsafeHtml, type SafeHtml } from '@/utils/html';
import { FavoriteButton } from './favorite-button';

export class GameDetailsContent extends BaseComponent<'div'> {
    private readonly game: GameDetails;

    constructor(game: GameDetails) {
        super('div', 'game-details__content');
        this.game = game;

        this.setHtml(html`
            ${this.renderHero()}
            <div class="game-details__body">${this.renderInfo()} ${this.renderRecords()}</div>
        `);

        this.query('[data-favorite-slot]')?.replaceWith(
            this.adopt(
                new FavoriteButton({
                    slug: game.slug,
                    isFavorited: game.isLikedByCurrentUser,
                    onChange: ({ likesCount }): void => this.showLikesCount(likesCount),
                }),
            ).element,
        );
    }

    private showLikesCount(count: number): void {
        const value = this.getElement('[data-likes-count]');
        value.textContent = formatCompactNumber(count);
    }

    private renderHero(): SafeHtml {
        return html`
            <header class="game-details__hero">
                <img
                    class="game-details__hero-img img-responsive"
                    src="${this.game.heroImage}"
                    alt="${this.game.name}"
                >
            </header>
        `;
    }

    private renderInfo(): SafeHtml {
        const { specs } = this.game;

        return html`
            <section class="game-details__info">
                <header class="game-details__info-header">
                    <div class="game-details__title-row">
                        <h2 class="game-details__title">${this.game.name}</h2>
                        <div class="game-details__meta">
                            <div class="game-details__meta-item meta-item meta-item--rating">
                                ${unsafeHtml(starIcon)}
                                <span class="meta-item__value">${this.game.rating}</span>
                            </div>
                            <div class="game-details__meta-item meta-item meta-item--likes">
                                ${unsafeHtml(heartIcon)}
                                <span class="meta-item__value" data-likes-count>
                                    ${formatCompactNumber(this.game.likesCount)}
                                </span>
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
                    <span data-favorite-slot></span>
                </div>
            </section>
        `;
    }

    private renderRecords(): SafeHtml {
        return html`
            <section class="game-details__records">
                <h3 class="game-details__section-title">
                    <span aria-hidden="true">🏆</span>
                    Top Records
                </h3>
                <ol class="game-details__records-list list-unstyled">
                    ${this.game.topRecords.map((record: TopRecord): SafeHtml => this.renderRecord(record))}
                </ol>
            </section>
        `;
    }

    private renderSpec(label: string, value: string): SafeHtml {
        return html`
            <div class="game-details__spec spec">
                <dt class="spec__label">${label}</dt>
                <dd class="spec__value">${value}</dd>
            </div>
        `;
    }

    private renderRecord(record: TopRecord): SafeHtml {
        return html`
            <li class="game-details__record record">
                <span class="record__position">
                    <span class="sr-only">Position ${record.position}</span>
                    <span aria-hidden="true">${this.getMedal(record.position)}</span>
                </span>
                <span class="record__player">${record.playerName}</span>
                <strong class="record__score">${record.score.toLocaleString('en-US')} pts</strong>
                <time class="record__date" datetime="${record.achievedAt}">
                    ${formatRelativeDate(record.achievedAt)}
                </time>
            </li>
        `;
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
