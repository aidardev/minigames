import { describe, expect, it } from 'vitest';
import { formatCompactNumber, formatNumber } from './formatters';

describe('formatNumber', () => {
    it.each([
        [0, '0'],
        [999, '999'],
        [1000, '1,000'],
        [1_234_567, '1,234,567'],
    ])('formats %d as %s', (value, expected) => {
        expect(formatNumber(value)).toBe(expected);
    });
});

describe('formatCompactNumber', () => {
    it.each([
        [0, '0'],
        [999, '999'],
    ])('keeps %d as is below one thousand', (value, expected) => {
        expect(formatCompactNumber(value)).toBe(expected);
    });

    it.each([
        [1000, '1K'],
        [1500, '1.5K'],
        [12_300, '12.3K'],
        [999_999, '999.9K'],
    ])('shortens %d to %s', (value, expected) => {
        expect(formatCompactNumber(value)).toBe(expected);
    });

    it.each([
        [1_000_000, '1M'],
        [2_500_000, '2.5M'],
        [12_345_678, '12.3M'],
    ])('shortens %d to %s', (value, expected) => {
        expect(formatCompactNumber(value)).toBe(expected);
    });

    it('cuts the extra digit instead of rounding it up', () => {
        expect(formatCompactNumber(1999)).toBe('1.9K');
        expect(formatCompactNumber(1_999_999)).toBe('1.9M');
    });
});
