import { describe, expect, it } from 'vitest';
import { toRem } from './to-rem';

describe('toRem', () => {
    it.each([
        [16, '1rem'],
        [8, '0.5rem'],
        [24, '1.5rem'],
        [0, '0rem'],
        [-8, '-0.5rem'],
    ])('converts %d px to %s with the default base of 16', (px, expected) => {
        expect(toRem(px)).toBe(expected);
    });

    it('divides by a custom base when one is given', () => {
        expect(toRem(20, 10)).toBe('2rem');
    });

    it.each([NaN, Infinity, -Infinity])(
        'throws a TypeError for %d, which is not a finite number',
        (value) => {
            expect(() => toRem(value)).toThrow(TypeError);
        },
    );

    it('names the invalid value in the error message', () => {
        expect(() => toRem(NaN)).toThrow('Value is not a valid number: NaN');
    });
});
