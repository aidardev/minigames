import { describe, expect, it } from 'vitest';
import { isSameLibraryQuery, parseLibraryQuery } from './library-query';

describe('parseLibraryQuery', () => {
    it('uses defaults for missing parameters', () => {
        expect(parseLibraryQuery(new URLSearchParams())).toEqual({
            query: { category: 'all', sort: 'rating-desc', page: 1 },
            hasInvalidValues: false,
        });
    });

    it.each(['rating-asc', 'rating-desc', 'name-asc', 'name-desc'])('accepts sort %s', (sort) => {
        expect(
            parseLibraryQuery(new URLSearchParams({ category: 'puzzle', sort, page: '3' })),
        ).toEqual({
            query: { category: 'puzzle', sort, page: 3 },
            hasInvalidValues: false,
        });
    });

    it('leaves unknown categories to the API and ignores unrelated parameters', () => {
        expect(
            parseLibraryQuery(new URLSearchParams('category=unknown&game=cat&auth=login')),
        ).toEqual({
            query: { category: 'unknown', sort: 'rating-desc', page: 1 },
            hasInvalidValues: false,
        });
    });

    it.each(['', 'abc', '0', '-1', '1.5', 'Infinity', '9007199254740992'])(
        'replaces invalid page %j without resetting valid filters',
        (page) => {
            expect(
                parseLibraryQuery(
                    new URLSearchParams({ category: 'puzzle', sort: 'name-asc', page }),
                ),
            ).toEqual({
                query: { category: 'puzzle', sort: 'name-asc', page: 1 },
                hasInvalidValues: true,
            });
        },
    );

    it.each(['', 'unknown'])(
        'replaces invalid sort %j without resetting category or page',
        (sort) => {
            expect(
                parseLibraryQuery(new URLSearchParams({ category: 'puzzle', sort, page: '2' })),
            ).toEqual({
                query: { category: 'puzzle', sort: 'rating-desc', page: 2 },
                hasInvalidValues: true,
            });
        },
    );

    it('replaces an empty category while keeping valid sort and page', () => {
        expect(parseLibraryQuery(new URLSearchParams('category=&sort=name-desc&page=2'))).toEqual({
            query: { category: 'all', sort: 'name-desc', page: 2 },
            hasInvalidValues: true,
        });
    });
});

describe('isSameLibraryQuery', () => {
    const query = { category: 'puzzle', sort: 'name-asc', page: 2 };

    it('compares values rather than object identity', () => {
        expect(isSameLibraryQuery(query, { ...query })).toBe(true);
    });

    it.each([{ category: 'all' }, { sort: 'rating-desc' }, { page: 3 }])(
        'detects changed fields: %j',
        (change) => {
            expect(isSameLibraryQuery(query, { ...query, ...change })).toBe(false);
        },
    );
});
