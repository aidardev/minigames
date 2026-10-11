import { describe, expect, it } from 'vitest';
import { getLeaderboardInitials } from './string';

describe('getLeaderboardInitials', () => {
    it.each([
        ['John Smith', 'JS'],
        ['JohnSmith', 'JS'],
        ['Alex Brown Jr', 'AB'],
    ])('takes the first two capital letters of "%s"', (name, expected) => {
        expect(getLeaderboardInitials(name)).toBe(expected);
    });

    it.each([
        ['alex', 'AL'],
        ['Alex', 'AL'],
        ['forest dweller', 'FO'],
        ['a', 'A'],
    ])(
        'falls back to the first two letters of "%s" when it has fewer than two capitals',
        (name, expected) => {
            expect(getLeaderboardInitials(name)).toBe(expected);
        },
    );

    it('does not count non-Latin letters as capitals, so it uses the fallback', () => {
        expect(getLeaderboardInitials('Иван Петров')).toBe('ИВ');
    });

    it('returns an empty string for an empty name', () => {
        expect(getLeaderboardInitials('')).toBe('');
    });
});
