import { BaseComponent } from '@/components/base-component';
import { ChipGroup } from '@/components/chip-group/chip-group';
import { Dropdown } from '@/components/dropdown/dropdown';
import type { Game, GameCategory } from '@/types/game.types';
import { GameGrid } from '../game-grid/game-grid';
import { SORT_OPTIONS } from './catalog.constants';
import './catalog.scss';

export class CatalogSection extends BaseComponent {
    constructor(games: Game[], categories: GameCategory[]) {
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

        const dropdown = new Dropdown({
            options: SORT_OPTIONS,
            activeId: SORT_OPTIONS[0].id,
            modifier: 'catalog__sort',
        });

        const grid = new GameGrid({ games });

        this.element
            .querySelector('.catalog__controls')
            ?.append(chipGroup.element, dropdown.element);

        this.element.querySelector('.catalog__grid')?.append(grid.element);
    }
}
