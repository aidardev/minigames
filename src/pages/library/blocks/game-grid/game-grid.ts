import { BaseComponent } from '@/components/base-component';
import { GameCard } from '@/components/game-card/game-card';
import type { Game } from '@/types/game.types';
import './game-grid.scss';

export interface GameGridProperties {
    games: Game[];
    onGameDetailsClick?: (slug: string) => void;
}

export class GameGrid extends BaseComponent {
    private onGameDetailsClick?: (slug: string) => void;

    private handleClick = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const button = target.closest<HTMLButtonElement>('.game-card__details');
        if (!button || !this.element.contains(button)) {
            return;
        }

        const slug = button.dataset.gameSlug;
        if (slug) {
            this.onGameDetailsClick?.(slug);
        }
    };

    constructor({ games, onGameDetailsClick }: GameGridProperties) {
        super('ul', 'game-grid list-unstyled');
        this.onGameDetailsClick = onGameDetailsClick;
        this.element.addEventListener('click', this.handleClick);
        this.render(games);
    }

    private render(games: Game[]): void {
        this.element.replaceChildren();

        if (games.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'game-grid__item game-grid__item--empty';

            const emptyText = document.createElement('p');
            emptyText.className = 'game-grid__empty';
            emptyText.textContent = 'No games found.';

            emptyItem.append(emptyText);
            this.element.append(emptyItem);
            return;
        }

        for (const game of games) {
            const item = document.createElement('li');
            item.className = 'game-grid__item';
            item.append(new GameCard(game).element);
            this.element.append(item);
        }
    }

    public update(games: Game[]): void {
        this.render(games);
    }

    public destroy(): void {
        this.element.removeEventListener('click', this.handleClick);
        super.destroy();
    }
}
