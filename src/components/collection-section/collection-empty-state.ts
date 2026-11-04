import arrowIcon from '@/assets/icons/arrow-forward.svg?raw';
import collectionsIcon from '@/assets/icons/collections.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { html, unsafeHtml } from '@/utils/html';
import './collection-section.scss';

interface CollectionEmptyStateProperties {
    title?: string;
    description?: string;
}

export class CollectionEmptyState extends BaseComponent<'div'> {
    constructor({
        title = 'Start with something you love',
        description = 'A cozy escape, a new adventure, or a little brain break. Find your first game and make this collection yours.',
    }: CollectionEmptyStateProperties = {}) {
        super('div', 'collection-section__empty');

        this.setHtml(html`
            <span class="collection-section__empty-icon" aria-hidden="true">
                ${unsafeHtml(collectionsIcon)}
            </span>
            <div class="collection-section__empty-text">
                <p class="collection-section__empty-title">${title}</p>
                <p class="collection-section__empty-description">${description}</p>
            </div>
            <a
                class="collection-section__browse btn btn--medium btn--primary"
                href="/library"
                data-link
            >
                Explore the library
                <span aria-hidden="true">${unsafeHtml(arrowIcon)}</span>
            </a>
        `);
    }
}
