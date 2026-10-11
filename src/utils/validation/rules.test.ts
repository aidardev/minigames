import { describe, expect, it } from 'vitest';
import { maxLength, minLength, pattern, required, sameAs } from './rules';

const MESSAGE = 'invalid';

describe('required', () => {
    it('fails only for an empty string', () => {
        const rule = required(MESSAGE);

        expect(rule('')).toBe(MESSAGE);
        expect(rule(' ')).toBeUndefined();
        expect(rule('a')).toBeUndefined();
    });
});

describe('minLength', () => {
    it('accepts values at the boundary and above', () => {
        const rule = minLength(3, MESSAGE);

        expect(rule('ab')).toBe(MESSAGE);
        expect(rule('abc')).toBeUndefined();
        expect(rule('abcd')).toBeUndefined();
    });
});

describe('maxLength', () => {
    it('accepts values at the boundary and below', () => {
        const rule = maxLength(3, MESSAGE);

        expect(rule('abcd')).toBe(MESSAGE);
        expect(rule('abc')).toBeUndefined();
        expect(rule('')).toBeUndefined();
    });
});

describe('pattern', () => {
    it('fails when the value does not match', () => {
        const rule = pattern(/^\d+$/, MESSAGE);

        expect(rule('123')).toBeUndefined();
        expect(rule('12a')).toBe(MESSAGE);
    });
});

describe('sameAs', () => {
    it('compares the value with another field of the form', () => {
        const rule = sameAs<{ a: string; b: string }>('a', MESSAGE);

        expect(rule('x', { a: 'x', b: 'x' })).toBeUndefined();
        expect(rule('y', { a: 'x', b: 'y' })).toBe(MESSAGE);
    });
});
