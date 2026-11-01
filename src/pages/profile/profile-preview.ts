import type { GamePreview } from '@/types/collection.types';
import type { CollectionSectionProperties } from './blocks/collection-section/collection-section';

export const PROFILE_PREVIEW = {
    displayName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
};

function game(slug: string, title: string): GamePreview {
    return { slug, title, image: `/assets/images/games/${slug}-card.jpg` };
}

const PREVIEW_DATE = new Date('2026-11-01T12:00:00Z');

export const COLLECTIONS_PREVIEW: readonly CollectionSectionProperties[] = [
    {
        id: 'slow-evenings',
        name: 'Slow evenings',
        description: 'A warm drink, a comfy spot, and nowhere to rush.',
        games: [
            game('tiny-glade', 'Tiny Glade'),
            game('cast-n-chill', 'Cast n Chill'),
            game('winter-burrow', 'Winter Burrow'),
            game('tukoni-forest-keepers', 'Tukoni: Forest Keepers'),
        ],
    },
    {
        id: 'next-on-my-list',
        name: 'Next on my list',
        description: "Little discoveries I can't wait to get lost in.",
        games: [
            game('heartopia', 'Heartopia'),
            game('palia', 'Palia'),
            game('wytchwood', 'Wytchwood'),
            game('grimshire', 'Grimshire'),
            game('the-wild-at-heart', 'The Wild at Heart'),
            game('cat-mail-co', 'Cat Mail Co.'),
            game('tailside-cozy-cafe-sim', 'Tailside: Cozy Cafe Sim'),
        ],
    },
    {
        id: 'little-worlds',
        name: 'Little worlds',
        description: 'Build something small. Make it feel like home.',
        games: [
            game('leafy-corner', 'Leafy Corner'),
            game('little-corners', 'Little Corners'),
            game('camper-van-make-it-home', 'Camper Van: Make it Home'),
        ],
    },
    {
        id: 'brain-break',
        name: 'A little brain break',
        description: 'A few thoughtful puzzles to reset the day.',
        games: [
            game('cozy-sudoku', 'Cozy Sudoku'),
            game('cat-chess', 'Cat Chess'),
            game('organized-inside', 'Organized Inside'),
        ],
    },
    {
        id: 'weekend-with-friends',
        name: 'Weekend with friends',
        description: 'Good company deserves a good collection.',
        games: [],
    },
].map(({ games, ...collection }) => ({
    collection: {
        ...collection,
        itemsCount: games.length,
        createdAt: PREVIEW_DATE,
        updatedAt: PREVIEW_DATE,
    },
    games,
}));
