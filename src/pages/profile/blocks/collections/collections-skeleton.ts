import { BaseComponent } from '@/components/base-component';
import '@/components/collection-section/collection-game.scss';
import '@/components/collection-section/collection-section.scss';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html, type SafeHtml } from '@/utils/html';
import './collections-skeleton.scss';
import './collections.scss';

const SECTION_COUNT = 2;
const GAMES_PER_SECTION = 4;

export class CollectionsSkeleton extends BaseComponent<'section'> {
    constructor() {
        super('section', 'profile-collections');
        this.element.setAttribute('aria-hidden', 'true');

        this.setHtml(html`
            <div class="profile-collections__header">
                <div>
                    ${skeletonHtml('profile-skeleton__title')}
                    ${skeletonHtml('profile-skeleton__description')}
                </div>
                ${skeletonHtml('profile-skeleton__button')}
            </div>
            <div class="profile-collections__list">
                ${Array.from(
                    { length: SECTION_COUNT },
                    (): SafeHtml => html`
                        <div class="collection-section">
                            <div class="collection-section__header">
                                <div class="collection-section__details">
                                    ${skeletonHtml('profile-skeleton__collection-title')}
                                    ${skeletonHtml('profile-skeleton__description')}
                                </div>
                                <div class="collection-section__actions">
                                    ${skeletonHtml('profile-skeleton__edit')}
                                    ${skeletonHtml('profile-skeleton__date')}
                                </div>
                            </div>
                            <ul class="collection-section__games list-unstyled">
                                ${Array.from(
                                    { length: GAMES_PER_SECTION },
                                    (): SafeHtml => html`
                                        <li class="collection-section__game">
                                            <div class="collection-game__inner">
                                                ${skeletonHtml('collection-game__image')}
                                                ${skeletonHtml('profile-skeleton__game-title')}
                                            </div>
                                        </li>
                                    `,
                                )}
                            </ul>
                        </div>
                    `,
                )}
            </div>
        `);
    }
}
