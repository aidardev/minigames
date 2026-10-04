import { openGameDetails } from '@/app/navigation';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Pagination } from '@/components/pagination/pagination';
import type { GamesPage } from '@/types/game.types';
import { html } from '@/utils/html';
import { GameGrid } from '../game-grid/game-grid';

export interface CatalogResultsProperties extends GamesPage {
    onPageChange: (page: number) => void;
}

/**
One response rendered as cards + pagination; the pagination is built from the response meta.
*/
export class CatalogResults extends BaseComponent<'div'> {
    constructor({ games, page, totalPages, onPageChange }: CatalogResultsProperties) {
        super('div', 'catalog__results-content');

        this.setHtml(html`
            <div class="catalog__grid"></div>
            <div class="catalog__pagination"></div>
        `);

        const isEmpty = games.length === 0;

        const content = isEmpty
            ? new EmptyState({
                  title: 'Data not found',
                  description: 'No games match these filters. Try another category or page.',
              })
            : new GameGrid({ games, onGameDetailsClick: openGameDetails });

        // Pagination stays visible for an empty list, on page 1
        const pagination = new Pagination({
            totalPages: Math.max(1, totalPages),
            currentPage: isEmpty ? 1 : page,
            onChange: onPageChange,
        });

        this.query('.catalog__grid')?.append(this.adopt(content).element);
        this.query('.catalog__pagination')?.append(this.adopt(pagination).element);
    }
}
