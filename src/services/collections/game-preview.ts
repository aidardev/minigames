import type { GamePreview } from '@/types/collection.types';
import type { GameDetails } from '@/types/game-details.types';

export function toGamePreview(game: GameDetails): GamePreview {
    return { slug: game.slug, title: game.name, image: game.heroImage };
}
