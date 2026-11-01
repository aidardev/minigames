import addIcon from '@/assets/icons/add.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { html, unsafeHtml } from '@/utils/html';
import {
    CollectionSection,
    type CollectionSectionProperties,
} from '../collection-section/collection-section';
import './collections.scss';

export class CollectionsSection extends BaseComponent<'section'> {
    constructor(collections: readonly CollectionSectionProperties[]) {
        super('section', 'profile-collections');
        this.element.setAttribute('aria-labelledby', 'collections-title');

        this.setHtml(html`
            <header class="profile-collections__header">
                <div>
                    <div class="profile-collections__heading">
                        <h2 class="profile-collections__title" id="collections-title">
                            My collections
                        </h2>
                        <span class="profile-collections__total">${collections.length}</span>
                    </div>
                    <p class="profile-collections__subtitle">
                        A place for every mood, and a game for every moment.
                    </p>
                </div>
                <button
                    class="profile-collections__create btn btn--medium btn--primary"
                    type="button"
                >
                    ${unsafeHtml(addIcon)} New collection
                </button>
            </header>
            <div class="profile-collections__list" data-collections-list></div>
        `);

        const list = this.getElement('[data-collections-list]');

        for (const collection of collections) {
            list.append(this.adopt(new CollectionSection(collection)).element);
        }
    }
}
