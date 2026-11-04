import editIcon from '@/assets/icons/edit.svg?raw';
import { BaseComponent } from '@/components/base-component';
import type { Collection, GamePreview } from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { CollectionEmptyState } from './collection-empty-state';
import { CollectionGame } from './collection-game';
import './collection-section.scss';

export interface CollectionSectionData {
    collection: Collection;
    games: readonly GamePreview[];
}

export interface CollectionSectionProperties extends CollectionSectionData {
    variant?: 'preview' | 'full';
    onGameClick: (slug: string) => void;
    onEdit: (id: string) => void;
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

    constructor({
        collection,
        games,
        onGameClick,
        onEdit,
        variant = 'preview',
    }: CollectionSectionProperties) {
        super('section', 'collection-section');
        this.element.classList.toggle('collection-section--full', variant === 'full');
        this.element.setAttribute('aria-label', collection.name);

        this.onGameClick = onGameClick;

        const { name, description, updatedAt } = collection;
        const gamesCount = games.length;

        this.setHtml(html`
            <header class="collection-section__header">
                <div class="collection-section__details">
                    <div class="collection-section__heading">
                        ${
                            variant === 'full'
                                ? html`<h1 class="collection-section__title">${name}</h1>`
                                : html`<h3 class="collection-section__title">
                                      <a
                                          class="collection-section__link"
                                          href="/profile/collections/${encodeURIComponent(collection.id)}"
                                          data-link
                                          >${name}</a
                                      >
                                  </h3>`
                        }
                        <span class="collection-section__count">
                            ${gamesCount} ${gamesCount === 1 ? 'game' : 'games'}
                        </span>
                    </div>
                    ${description && html`<p class="collection-section__description">${description}</p>`}
                </div>
                <div class="collection-section__actions">
                    <button
                        class="collection-section__edit btn btn--small btn--white"
                        type="button"
                        aria-label="Edit collection ${name}"
                    >
                        ${unsafeHtml(editIcon)} Edit collection
                    </button>
                    <span class="collection-section__updated">
                        Updated
                        <time datetime="${updatedAt.toISOString()}">
                            ${DATE_FORMAT.format(updatedAt)}
                        </time>
                    </span>
                </div>
            </header>
            <div data-collection-content></div>
        `);

        this.getElement('.collection-section__edit').addEventListener('click', (): void => {
            onEdit(collection.id);
        });

        const content = this.getElement('[data-collection-content]');

        if (games.length === 0) {
            content.replaceWith(this.adopt(new CollectionEmptyState()).element);
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
