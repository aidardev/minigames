import { getComments } from '@/api/comments';
import { getGameDetails } from '@/api/game-details';
import leftArrowIcon from '@/assets/icons/arrow-back.svg?raw';
import rightArrowIcon from '@/assets/icons/arrow-forward.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { GameDetailsDialog } from '@/components/dialogs/game-details-dialog/game-details-dialog';
import { GameSlide } from '@/components/game-slide/game-slide';
import { NEW_GAMES_MOCK } from './new-games.mock';
import './new-games.scss';

export class NewGamesSection extends BaseComponent {
    constructor() {
        super('section', 'section section-new-games');

        this.element.innerHTML = /* HTML */ `
            <div class="container">
                <div class="section-header">
                    <h2 class="section-header__title section-title">New Games</h2>
                    <div class="section-header__slider-controls">
                        <button
                            class="slider__arrow slider__arrow--prev"
                            type="button"
                            aria-label="Previous slide"
                        >
                            ${leftArrowIcon}
                        </button>
                        <button
                            class="slider__arrow slider__arrow--next"
                            type="button"
                            aria-label="Next slide"
                        >
                            ${rightArrowIcon}
                        </button>
                    </div>
                </div>
                <div class="slider-new-games slider">
                    <ul class="slider-new-games__track slider__track list-unstyled"></ul>
                </div>
            </div>
        `;

        this.renderCards();
    }

    private renderCards(): void {
        const track = this.query('.slider__track');
        if (!track) return;

        for (const [index, game] of NEW_GAMES_MOCK.entries()) {
            const card = new GameSlide({
                game,
                onClick: () => {
                    this.openGameDetails();
                },
            }).element;
            const li = document.createElement('li');
            li.classList.add('slider-new-games__slide', 'slider__slide', this.getSlideClass(index));
            li.append(card);
            track.append(li);
        }
    }

    private getSlideClass(index: number) {
        switch (index) {
            case 0: {
                return 'is-far-prev';
            }
            case 1: {
                return 'is-prev';
            }
            case 2: {
                return 'is-active';
            }
            case 3: {
                return 'is-next';
            }
            case 4: {
                return 'is-far-next';
            }
            default: {
                return '';
            }
        }
    }

    private async openGameDetails(): Promise<void> {
        const [game, comments] = await Promise.all([getGameDetails(), getComments()]);

        new GameDetailsDialog({
            game,
            comments,
        }).open();
    }
}
