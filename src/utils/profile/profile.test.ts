import { describe, expect, it } from 'vitest';
import { FALLBACK_PROFILE_NAME, getInitial, getInitials, getProfileView } from './profile';

describe('getInitials', () => {
    it.each([
        ['John', 'J'],
        ['john doe', 'JD'],
        ['  anna   maria  lopez ', 'AM'],
        ['Алексей Иванов', 'АИ'],
        ['Élodie Durand', 'ÉD'],
        ['李 雷', '李雷'],
        ['42 cats', '4C'],
    ])('takes the first alphanumeric character of up to two words: "%s"', (name, initials) => {
        expect(getInitials(name)).toBe(initials);
    });

    it('skips leading symbols inside a word', () => {
        expect(getInitials('@alex')).toBe('A');
        expect(getInitials('"Bob" (Rob)')).toBe('BR');
    });

    it('ignores words without letters or digits', () => {
        expect(getInitials('- John')).toBe('J');
        expect(getInitials('😀 Bob')).toBe('B');
    });

    it.each([[''], [' '.repeat(3)], ['@@@'], ['😀']])('returns nothing for "%s"', (name) => {
        expect(getInitials(name)).toBe('');
    });
});

describe('getInitial', () => {
    it('returns the uppercase first letter', () => {
        expect(getInitial('alex')).toBe('A');
    });

    it('skips leading whitespace', () => {
        expect(getInitial('  forest')).toBe('F');
    });

    it('does not cut a surrogate pair', () => {
        expect(getInitial('🌲tree')).toBe('🌲');
    });

    it('returns an empty string for an empty name', () => {
        expect(getInitial(' '.repeat(3))).toBe('');
    });
});

describe('getProfileView', () => {
    const email = 'alex.doe@minigames.com';

    it('uses the trimmed display name', () => {
        expect(getProfileView({ displayName: '  Alex Doe ', email })).toStrictEqual({
            name: 'Alex Doe',
            initials: 'AD',
        });
    });

    it('falls back to the part of the email before "@"', () => {
        expect(getProfileView({ displayName: '', email })).toStrictEqual({
            name: 'alex.doe',
            initials: 'A',
        });
        expect(getProfileView({ displayName: ' '.repeat(3), email }).name).toBe('alex.doe');
    });

    it.each([[''], ['no-at-sign'], ['@minigames.com']])(
        'uses a generic name and no initials when the email "%s" has no name part',
        (brokenEmail) => {
            expect(getProfileView({ displayName: '', email: brokenEmail })).toStrictEqual({
                name: FALLBACK_PROFILE_NAME,
                initials: '',
            });
        },
    );

    it('keeps a name without letters but gives it no initials', () => {
        expect(getProfileView({ displayName: '!!!', email })).toStrictEqual({
            name: '!!!',
            initials: '',
        });
    });

    it('does not interpret the name as markup', () => {
        const name = '<img src=x onerror=alert(1)>';

        expect(getProfileView({ displayName: name, email }).name).toBe(name);
    });
});
