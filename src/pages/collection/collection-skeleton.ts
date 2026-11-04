import { BaseComponent } from '@/components/base-component';
import '@/components/collection-section/collection-game.scss';
import '@/components/collection-section/collection-section.scss';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html } from '@/utils/html';

export class CollectionSkeleton extends BaseComponent<'section'> {
    constructor() {
        super('section', 'collection-section collection-section--full collection-page__skeleton');
        this.element.setAttribute('aria-hidden', 'true');
        this.setHtml(html`
            <div class="collection-section__header">
                <div class="collection-section__details">
                    ${skeletonHtml('collection-page__skeleton-title')}
                    ${skeletonHtml('collection-page__skeleton-description')}
                </div>
                <div class="collection-section__actions">
                    ${skeletonHtml('collection-page__skeleton-edit')}
                    ${skeletonHtml('collection-page__skeleton-date')}
                </div>
            </div>
            <ul class="collection-section__games list-unstyled">
                ${Array.from(
                    { length: 6 },
                    () => html`
                        <li class="collection-section__game">
                            <div class="collection-game__inner">
                                ${skeletonHtml('collection-game__image')}
                                ${skeletonHtml('collection-page__skeleton-game-title')}
                            </div>
                        </li>
                    `,
                )}
            </ul>
        `);
    }
}
