import arrowIcon from '@/assets/icons/arrow-forward.svg?raw';
import collectionsIcon from '@/assets/icons/collections.svg?raw';
import { BaseComponent } from '@/components/base-component';
import type { Collection, GamePreview } from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { CollectionGame } from '../collection-game/collection-game';
import './collection-section.scss';

export interface CollectionSectionData {
    collection: Collection;
    games: readonly GamePreview[];
}

export interface CollectionSectionProperties extends CollectionSectionData {
    onGameClick: (slug: string) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

export class CollectionSection extends BaseComponent<'section'> {
    private onGameClick?: (slug: string) => void;

    private handleClick = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const card = target.closest<HTMLElement>('.collection-game');
        if (!card) return;

        const slug = card.dataset.slug;
        if (slug) {
            this.onGameClick?.(slug);
        }
    };

    constructor({ collection, games, onGameClick }: CollectionSectionProperties) {
        super('section', 'collection-section');
        this.element.setAttribute('aria-label', collection.name);

        this.onGameClick = onGameClick;

        const { name, description, itemsCount, updatedAt } = collection;

        this.setHtml(html`
            <header class="collection-section__header">
                <div class="collection-section__details">
                    <div class="collection-section__heading">
                        <h3 class="collection-section__title">${name}</h3>
                        <span class="collection-section__count">
                            ${itemsCount} ${itemsCount === 1 ? 'game' : 'games'}
                        </span>
                    </div>
                    ${description && html`<p class="collection-section__description">${description}</p>`}
                </div>
                <span class="collection-section__updated">
                    Updated
                    <time datetime="${updatedAt.toISOString()}">
                        ${DATE_FORMAT.format(updatedAt)}
                    </time>
                </span>
            </header>
            <div data-collection-content></div>
        `);

        const content = this.getElement('[data-collection-content]');

        if (games.length === 0) {
            content.innerHTML = html`
                <div class="collection-section__empty">
                    <span class="collection-section__empty-icon" aria-hidden="true">
                        ${unsafeHtml(collectionsIcon)}
                    </span>
                    <div class="collection-section__empty-text">
                        <p class="collection-section__empty-title">Start with something you love</p>
                        <p class="collection-section__empty-description">
                            A cozy escape, a new adventure, or a little brain break. Find your first
                            game and make this collection yours.
                        </p>
                    </div>
                    <a
                        class="collection-section__browse btn btn--medium btn--primary"
                        href="/library"
                        data-link
                    >
                        Explore the library
                        <span aria-hidden="true">${unsafeHtml(arrowIcon)}</span>
                    </a>
                </div>
            `.value;
            return;
        }

        const list = document.createElement('ul');
        list.className = 'collection-section__games list-unstyled';
        list.setAttribute('aria-label', `Games in ${name}`);

        for (const game of games) {
            const item = document.createElement('li');
            item.className = 'collection-section__game';
            item.append(this.adopt(new CollectionGame(game)).element);
            list.append(item);
        }

        content.replaceWith(list);

        this.element.addEventListener('click', this.handleClick);
    }
}
