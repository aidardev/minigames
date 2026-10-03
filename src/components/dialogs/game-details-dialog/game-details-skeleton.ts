import { BaseComponent } from '@/components/base-component';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html, type SafeHtml } from '@/utils/html';

export class GameDetailsSkeleton extends BaseComponent<'div'> {
    constructor() {
        super('div', 'game-details__content');
        this.element.setAttribute('aria-hidden', 'true');

        this.setHtml(html`
            ${skeletonHtml('game-details__skeleton-hero')}
            <div class="game-details__body">
                <div class="game-details__info">
                    ${skeletonHtml('game-details__skeleton-title')}
                    ${skeletonHtml('game-details__skeleton-text')}
                    ${skeletonHtml('game-details__skeleton-text')}
                    <div class="game-details__specs">
                        ${[1, 2, 3, 4].map((): SafeHtml => skeletonHtml('game-details__skeleton-spec'))}
                    </div>
                    <div class="game-details__actions">
                        ${skeletonHtml('game-details__skeleton-button')}
                        ${skeletonHtml('game-details__skeleton-button')}
                    </div>
                </div>
            </div>
        `);
    }
}
