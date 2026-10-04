import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html, type SafeHtml } from '@/utils/html';

export function renderGameCardSkeleton(): SafeHtml {
    return html`
        <article class="game-card" aria-hidden="true">
            <div class="game-card__inner">
                ${skeletonHtml('game-card__img game-card__skeleton-img')}
                <div class="game-card__body">
                    <div class="game-card__heading">
                        ${skeletonHtml('game-card__skeleton-title')}
                        ${skeletonHtml('game-card__skeleton-badge')}
                    </div>
                    <div class="game-card__skeleton-text">
                        ${skeletonHtml('game-card__skeleton-line')}
                        ${skeletonHtml('game-card__skeleton-line game-card__skeleton-line--short')}
                    </div>
                    <div class="game-card__footer">
                        ${skeletonHtml('game-card__skeleton-meta')}
                        ${skeletonHtml('game-card__skeleton-button')}
                    </div>
                </div>
            </div>
        </article>
    `;
}
