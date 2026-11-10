import { describe, expect, it } from 'vitest';
import { matchRoute } from './route-matcher';

describe('matchRoute', () => {
    it('matches static paths and returns empty params', () => {
        expect(matchRoute('/library', ['/', '/library'])).toStrictEqual({
            pattern: '/library',
            params: {},
        });
        expect(matchRoute('/', ['/'])).toStrictEqual({ pattern: '/', params: {} });
    });

    it('extracts multiple named segments', () => {
        const pattern = '/users/:userId/collections/:collectionId';

        expect(matchRoute('/users/alex/collections/puzzles', [pattern])).toStrictEqual({
            pattern,
            params: { userId: 'alex', collectionId: 'puzzles' },
        });
    });

    it.each([
        '/profile/collections',
        '/profile/collections/',
        '/profile/collections//',
        '/profile/collections/first/items',
        '/other/collections/first',
    ])('does not match missing, empty or extra segments in %s', (path) => {
        expect(matchRoute(path, ['/profile/collections/:id'])).toBeUndefined();
    });

    it('prefers a static route regardless of registration order', () => {
        const patterns = ['/profile/collections/:id', '/profile/collections/new'];

        expect(matchRoute('/profile/collections/new', patterns)).toStrictEqual({
            pattern: '/profile/collections/new',
            params: {},
        });
        expect(matchRoute('/profile/collections/new', patterns.toReversed())).toStrictEqual({
            pattern: '/profile/collections/new',
            params: {},
        });
    });

    it('prefers the matching pattern with more static segments', () => {
        expect(
            matchRoute('/profile/collections/first', [
                '/:section/:category/:id',
                '/profile/:category/:id',
                '/profile/collections/:id',
            ]),
        ).toStrictEqual({
            pattern: '/profile/collections/:id',
            params: { id: 'first' },
        });
    });

    it('uses registration order for equally specific patterns', () => {
        expect(matchRoute('/games/puzzle', ['/games/:slug', '/:category/puzzle'])).toStrictEqual({
            pattern: '/games/:slug',
            params: { slug: 'puzzle' },
        });
    });

    it('treats static segments literally, including regular expression characters', () => {
        expect(matchRoute('/games.v2/a+b', ['/games.v2/:slug'])).toStrictEqual({
            pattern: '/games.v2/:slug',
            params: { slug: 'a+b' },
        });
        expect(matchRoute('/gamesXv2/a+b', ['/games.v2/:slug'])).toBeUndefined();
    });

    it('decodes parameter values once, after splitting the path', () => {
        expect(
            matchRoute('/collections/%D0%B8%D0%B3%D1%80%D1%8B%20%2B', ['/collections/:id']),
        ).toStrictEqual({ pattern: '/collections/:id', params: { id: 'игры +' } });
        expect(matchRoute('/collections/a%2Fb', ['/collections/:id'])).toStrictEqual({
            pattern: '/collections/:id',
            params: { id: 'a/b' },
        });
        expect(matchRoute('/collections/%252F', ['/collections/:id'])).toStrictEqual({
            pattern: '/collections/:id',
            params: { id: '%2F' },
        });
    });

    it('does not throw on malformed URL encoding', () => {
        expect(matchRoute('/collections/%E0%A4%A', ['/collections/:id'])).toBeUndefined();
    });

    it('handles parameter names that also exist on Object.prototype', () => {
        const match = matchRoute('/collections/first', ['/collections/:__proto__']);

        expect(match?.params.__proto__).toBe('first');
        expect(Object.getPrototypeOf(match?.params)).toBe(Object.prototype);
    });
});
