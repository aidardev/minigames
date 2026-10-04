import type { DropdownOption } from '@/components/dropdown/dropdown';
import { DEFAULT_CATEGORY, DEFAULT_SORT, SORT_OPTIONS } from './blocks/catalog/catalog.constants';

export interface LibraryQuery {
    category: string;
    sort: string;
    page: number;
}

export interface ParsedLibraryQuery {
    query: LibraryQuery;
    // True when the URL holds a value that had to be replaced by a default (?page=abc).
    hasInvalidValues: boolean;
}

export function parseLibraryQuery(parameters: URLSearchParams): ParsedLibraryQuery {
    const rawCategory = parameters.get('category');
    const rawSort = parameters.get('sort');
    const rawPage = parameters.get('page');

    // Unknown category slugs are not rejected here: the API owns that list and answers 400.
    const isCategoryValid = rawCategory === null || rawCategory.length > 0;
    const isSortValid =
        rawSort === null ||
        SORT_OPTIONS.some((option: DropdownOption): boolean => option.id === rawSort);

    const page = rawPage === null ? 1 : Number(rawPage);
    const isPageValid = Number.isSafeInteger(page) && page >= 1;

    return {
        query: {
            category: isCategoryValid ? (rawCategory ?? DEFAULT_CATEGORY) : DEFAULT_CATEGORY,
            sort: isSortValid ? (rawSort ?? DEFAULT_SORT) : DEFAULT_SORT,
            page: isPageValid ? page : 1,
        },
        hasInvalidValues: !isCategoryValid || !isSortValid || !isPageValid,
    };
}

export function isSameLibraryQuery(a: LibraryQuery, b: LibraryQuery): boolean {
    return a.category === b.category && a.sort === b.sort && a.page === b.page;
}
