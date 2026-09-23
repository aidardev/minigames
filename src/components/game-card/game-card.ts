import heartIcon from '@/assets/icons/favorite.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import { BaseComponent } from '@/components/base-component';
import type { Game } from '@/types/game.types';
import { formatCompactNumber } from '@/utils/formatters';
import './game-card.scss';

export class GameCard extends BaseComponent {
    constructor(game: Game) {
        super('article', 'game-card');

        const isFree = game.price === 'Free';

        this.element.innerHTML = /* HTML */ `
            <div class="game-card__inner">
                <img
                    class="game-card__img"
                    src="${game.cardImage}"
                    alt="${game.name}"
                    loading="lazy"
                >
                <div class="game-card__body">
                    <div class="game-card__heading">
                        <h3 class="game-card__title">${game.name}</h3>
                        <div class="game-card__category">${game.category}</div>
                        <div
                            class="game-card__price game-card__price--desktop${isFree ? ' game-card__price--free' : ''}"
                        >
                            ${game.price}
                        </div>
                    </div>
                    <p class="game-card__description">${game.shortDescription}</p>
                    <div class="game-card__footer">
                        <div class="game-card__meta">
                            <div class="game-card__meta-item meta-item meta-item--rating">
                                ${starIcon}
                                <span class="meta-item__value">${game.rating}</span>
                            </div>
                            <div class="game-card__meta-item meta-item meta-item--likes">
                                ${heartIcon}
                                <span class="meta-item__value"
                                    >${formatCompactNumber(game.likesCount)}</span
                                >
                            </div>
                        </div>
                        <div
                            class="game-card__price game-card__price--mobile${isFree ? ' game-card__price--free' : ''}"
                        >
                            ${game.price}
                        </div>
                        <button
                            type="button"
                            class="game-card__details btn btn--medium btn--primary"
                            data-game-slug="${game.slug}"
                        >
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}
