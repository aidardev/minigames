import type { DropdownOption } from '@/components/dropdown/dropdown';

export const GAMES_PER_PAGE = 6;

export const SORT_OPTIONS: DropdownOption[] = [
    {
        id: 'rating-asc',
        label: 'Rating ↑',
    },
    {
        id: 'rating-desc',
        label: 'Rating ↓',
    },
    {
        id: 'name-asc',
        label: 'Name A→Z',
    },
    {
        id: 'name-desc',
        label: 'Name Z→A',
    },
];
