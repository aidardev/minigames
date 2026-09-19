import heartIcon from '@/assets/icons/favorite.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import type { GameSlideData } from '@/types/game.types';
import { BaseComponent } from '../base-component';
import './game-slide.scss';

export class GameSlide extends BaseComponent {
    public constructor(game: GameSlideData) {
        super('article', 'game-slide focusable-parent');

        this.element.innerHTML = /* HTML */ `
            <img src="${game.cardImage}" alt="${game.name}" class="game-slide__img" loading="lazy">

            <div class="game-slide__overlay">
                <h3 class="game-slide__title">
                    <a href="/" class="game-slide__link focusable-link">
                        <span class="game-slide__title-text">${game.name}</span>
                    </a>
                </h3>

                <div class="game-slide__meta">
                    <div class="game-slide__meta-item game-slide__meta-item--rating">
                        ${starIcon}
                        <span class="game-slide__meta-value">${game.rating}</span>
                    </div>
                    <div class="game-slide__meta-item game-slide__meta-item--likes">
                        ${heartIcon}
                        <span class="game-slide__meta-value">${game.likesCount}</span>
                    </div>
                </div>
            </div>
        `;
    }
}
