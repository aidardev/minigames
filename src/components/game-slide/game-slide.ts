import heartIcon from '@/assets/icons/favorite.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import type { GameSlideData } from '@/types/game.types';
import { formatCompactNumber } from '@/utils/formatters';
import { BaseComponent } from '../base-component';
import './game-slide.scss';

export class GameSlide extends BaseComponent {
    public constructor(game: GameSlideData) {
        super('article', 'game-slide focusable-parent');

        this.element.innerHTML = /* HTML */ `
            <img src="${game.cardImage}" alt="" class="game-slide__img" loading="lazy">

            <div class="game-slide__overlay">
                <h3 class="game-slide__title">
                    <a href="/" class="game-slide__link focusable-link">
                        <span class="game-slide__title-text">${game.name}</span>
                    </a>
                </h3>

                <div class="game-slide__meta">
                    <div class="game-slide__meta-item meta-item meta-item--rating">
                        ${starIcon}
                        <span class="meta-item__value">${game.rating}</span>
                    </div>
                    <div class="game-slide__meta-item meta-item meta-item--likes">
                        ${heartIcon}
                        <span class="meta-item__value"
                            >${formatCompactNumber(game.likesCount)}</span
                        >
                    </div>
                </div>
            </div>
        `;
    }
}
