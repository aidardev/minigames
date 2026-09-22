import { BaseComponent } from '@/components/base-component';
import './catalog.scss';

export class CatalogSection extends BaseComponent {
    constructor() {
        super('section', 'section-catalog');

        this.element.innerHTML = /* HTML */ `
            <div class="catalog container">
                <div class="catalog__controls"></div>
                <div class="catalog__grid"></div>
                <div class="catalog__pagination"></div>
            </div>
        `;
    }
}
