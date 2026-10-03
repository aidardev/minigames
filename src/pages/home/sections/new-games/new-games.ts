import { getFeaturedGames } from '@/api/games';
import leftArrowIcon from '@/assets/icons/arrow-back.svg?raw';
import rightArrowIcon from '@/assets/icons/arrow-forward.svg?raw';
import { AsyncRegion } from '@/components/async-region/async-region';
import { BaseComponent } from '@/components/base-component';
import { GameDetailsDialog } from '@/components/dialogs/game-details-dialog/game-details-dialog';
import { EmptyState } from '@/components/empty-state/empty-state';
import { GameSlide } from '@/components/game-slide/game-slide';
import { Slider } from '@/components/slider/slider';
import { createSliderSkeleton } from '@/components/slider/slider-skeleton';
import type { Game } from '@/types/game.types';
import { html, unsafeHtml } from '@/utils/html';
import './new-games.scss';

const AUTOPLAY_INTERVAL_MS = 4000;

const SLIDER_CLASSES = {
    className: 'slider-new-games',
    trackClassName: 'slider-new-games__track',
    slideClassName: 'slider-new-games__slide',
} as const;

export class NewGamesSection extends BaseComponent {
    private readonly region: AsyncRegion<Game[]>;
    // Exists only while games are displayed; the arrows are disabled until then.
    private slider: Slider | undefined;

    constructor() {
        super('section', 'section section-new-games');

        // The header is static and lives outside the region, so it stays visible
        // (and the arrows keep their listeners) while the slider area changes state.
        this.setHtml(html`
            <div class="container">
                <div class="section-header">
                    <h2 class="section-header__title section-title">New Games</h2>
                    <div class="section-header__slider-controls">
                        <button
                            class="slider__arrow slider__arrow--prev"
                            type="button"
                            aria-label="Previous slide"
                            disabled
                        >
                            ${unsafeHtml(leftArrowIcon)}
                        </button>
                        <button
                            class="slider__arrow slider__arrow--next"
                            type="button"
                            aria-label="Next slide"
                            disabled
                        >
                            ${unsafeHtml(rightArrowIcon)}
                        </button>
                    </div>
                </div>
            </div>
        `);

        this.region = this.adopt(
            new AsyncRegion<Game[]>({
                load: (signal: AbortSignal): Promise<Game[]> => getFeaturedGames(signal),
                renderSkeleton: (): HTMLElement =>
                    createSliderSkeleton({
                        ...SLIDER_CLASSES,
                        itemClassName: 'slider-new-games__skeleton-item',
                    }),
                renderSuccess: (games: Game[]): Slider => this.createSlider(games),
                renderEmpty: (): EmptyState =>
                    new EmptyState({
                        title: 'No new games yet',
                        description: 'Check back soon: new games are added regularly.',
                    }),
            }),
        );

        this.query('.container')?.append(this.region.element);

        this.bindControls();
        this.region.load();
    }

    private bindControls(): void {
        const previousButton = this.query<HTMLButtonElement>('.slider__arrow--prev');
        const nextButton = this.query<HTMLButtonElement>('.slider__arrow--next');

        previousButton?.addEventListener('click', (): void => this.slider?.prev());
        nextButton?.addEventListener('click', (): void => this.slider?.next());
    }

    private createSlider(games: readonly Game[]): Slider {
        const slider = new Slider({ ...SLIDER_CLASSES, autoplayInterval: AUTOPLAY_INTERVAL_MS });

        slider.addSlides(
            games.map(
                (game: Game): HTMLElement =>
                    new GameSlide({
                        game,
                        onClick: (slug: string): void => {
                            new GameDetailsDialog({ slug }).open();
                        },
                    }).element,
            ),
        );

        this.slider = slider;
        this.setArrowsDisabled(false);

        return slider;
    }

    private setArrowsDisabled(isDisabled: boolean): void {
        for (const selector of ['.slider__arrow--prev', '.slider__arrow--next']) {
            const button = this.query<HTMLButtonElement>(selector);

            if (button) button.disabled = isDisabled;
        }
    }
}
