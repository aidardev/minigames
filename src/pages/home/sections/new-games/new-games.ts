import { getComments } from '@/api/comments';
import { getGameDetails } from '@/api/game-details';
import { getGames } from '@/api/games';
import leftArrowIcon from '@/assets/icons/arrow-back.svg?raw';
import rightArrowIcon from '@/assets/icons/arrow-forward.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { GameDetailsDialog } from '@/components/dialogs/game-details-dialog/game-details-dialog';
import { GameSlide } from '@/components/game-slide/game-slide';
import { Slider } from '@/components/slider/slider';
import type { Game } from '@/types/game.types';
import './new-games.scss';

const AUTOPLAY_INTERVAL_MS = 4000;

export class NewGamesSection extends BaseComponent {
    private readonly slider: Slider;

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
            </div>
        `;

        this.slider = new Slider({
            className: 'slider-new-games',
            trackClassName: 'slider-new-games__track',
            slideClassName: 'slider-new-games__slide',
            autoplayInterval: AUTOPLAY_INTERVAL_MS,
        });

        const container = this.query('.container');
        if (!container) return;

        container.append(this.slider.element);

        this.bindControls();
        this.loadGames();
    }

    private bindControls(): void {
        const previousButton = this.query<HTMLButtonElement>('.slider__arrow--prev');
        const nextButton = this.query<HTMLButtonElement>('.slider__arrow--next');

        previousButton?.addEventListener('click', (): void => this.slider.prev());
        nextButton?.addEventListener('click', (): void => this.slider.next());
    }

    private async loadGames(): Promise<void> {
        const games = await getGames();

        const featuredGames = games.filter((game: Game): boolean => game.featured);

        this.renderCards(featuredGames);
    }

    private renderCards(games: readonly Game[]): void {
        const slides = games.map(
            (game): HTMLElement =>
                new GameSlide({
                    game,
                    onClick: (): void => {
                        this.openGameDetails();
                    },
                }).element,
        );

        this.slider.addSlides(slides);
    }

    private async openGameDetails(): Promise<void> {
        const [game, comments] = await Promise.all([getGameDetails(), getComments()]);

        new GameDetailsDialog({
            game,
            comments,
        }).open();
    }
}
