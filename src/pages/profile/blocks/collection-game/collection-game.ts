import { BaseComponent } from '@/components/base-component';
import type { GamePreview } from '@/types/collection.types';
import { html } from '@/utils/html';
import './collection-game.scss';

export class CollectionGame extends BaseComponent<'article'> {
    constructor({ slug, title, image }: GamePreview) {
        super('article', 'collection-game');

        this.element.dataset.slug = slug;

        this.setHtml(html`
            <button class="collection-game__inner" type="button" aria-haspopup="dialog">
                <img class="collection-game__image" src="${image}" alt="" loading="lazy">
                <span class="collection-game__name">${title}</span>
            </button>
        `);
    }
}
