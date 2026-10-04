import { BaseComponent } from '@/components/base-component';
import { renderGameCardSkeleton } from '@/components/game-card/game-card-skeleton';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html, type SafeHtml } from '@/utils/html';
import { GAMES_PER_PAGE } from './catalog.constants';

const SKELETON_CHIP_COUNT = 7;

export class CatalogResultsSkeleton extends BaseComponent<'div'> {
    constructor() {
        super('div', 'catalog__results-content');
        this.element.setAttribute('aria-hidden', 'true');

        this.setHtml(html`
            <div class="catalog__grid">
                <ul class="game-grid list-unstyled">
                    ${Array.from(
                        { length: GAMES_PER_PAGE },
                        (): SafeHtml =>
                            html`<li class="game-grid__item">${renderGameCardSkeleton()}</li>`,
                    )}
                </ul>
            </div>
            <div class="catalog__pagination">${skeletonHtml('catalog__skeleton-pagination')}</div>
        `);
    }
}

export class CategoriesSkeleton extends BaseComponent<'div'> {
    constructor() {
        super('div', 'chip-group catalog__chip-group');
        this.element.setAttribute('aria-hidden', 'true');

        this.setHtml(html`
            ${Array.from({ length: SKELETON_CHIP_COUNT }, (): SafeHtml =>
                skeletonHtml('catalog__skeleton-chip'),
            )}
        `);
    }
}
