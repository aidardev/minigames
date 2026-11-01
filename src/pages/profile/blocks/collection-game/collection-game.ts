import { BaseComponent } from '@/components/base-component';
import type { GamePreview } from '@/types/collection.types';
import { html } from '@/utils/html';
import './collection-game.scss';

export class CollectionGame extends BaseComponent<'article'> {
    constructor({ title, image }: GamePreview) {
        super('article', 'collection-game');

        this.setHtml(html`
            <img class="collection-game__image" src="${image}" alt="" loading="lazy">
            <h4 class="collection-game__name">${title}</h4>
        `);
    }
}
