import heartIcon from '@/assets/icons/favorite.svg?raw';
import starIcon from '@/assets/icons/star.svg?raw';
import type { Game } from '@/types/game.types';
import { formatCompactNumber } from '@/utils/formatters';
import { BaseComponent } from '../base-component';
import './game-slide.scss';

export interface GameSlideProperties {
    game: Game;
    onClick?: (slug: string) => void;
}

export class GameSlide extends BaseComponent {
    private readonly game: Game;

    private readonly onClick?: (slug: string) => void;

    private handleClick = (): void => {
        this.onClick?.(this.game.slug);
    };

    constructor({ game, onClick }: GameSlideProperties) {
        super('article', 'game-slide');

        this.game = game;
        this.onClick = onClick;

        this.element.innerHTML = /* HTML */ `
            <img src="${game.cardImage}" alt="" class="game-slide__img" loading="lazy">

            <div class="game-slide__overlay">
                <h3 class="game-slide__title">
                    <span class="game-slide__title-text">${game.name}</span>
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

        this.element.addEventListener('click', this.handleClick);
    }

    public override destroy(): void {
        this.element.removeEventListener('click', this.handleClick);
        super.destroy();
    }
}
