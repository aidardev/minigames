import { BaseComponent } from '@/components/base-component';
import { ChipGroup } from '@/components/chip-group/chip-group';
import type { GameCategory } from '@/types/game.types';
import './catalog.scss';

export class CatalogSection extends BaseComponent {
    constructor(categories: GameCategory[]) {
        super('section', 'section-catalog');

        this.element.innerHTML = /* HTML */ `
            <div class="catalog container">
                <div class="catalog__controls"></div>
                <div class="catalog__grid"></div>
                <div class="catalog__pagination"></div>
            </div>
        `;

        const defaultCategory = categories.find((category) => category.isDefault);

        const chipOptions = categories.map((category) => ({
            id: category.slug,
            label: category.label,
        }));

        const chipGroup = new ChipGroup({
            options: chipOptions,
            activeId: defaultCategory?.slug ?? categories[0]?.slug ?? '',
            modifier: 'catalog__chip-group',
        });

        this.element.querySelector('.catalog__controls')?.append(chipGroup.element);
    }
}
