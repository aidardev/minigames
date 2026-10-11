import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeDate } from './date';

const NOW = new Date('2026-01-01T12:00:00Z').getTime();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const YEAR = 365 * DAY;

function ago(ms: number): string {
    return new Date(NOW - ms).toISOString();
}

describe('formatRelativeDate', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([
        ['the same moment', 'just now', 0],
        ['just under a minute', 'just now', MINUTE - 1],
        ['exactly a minute', '1 min ago', MINUTE],
        ['just under an hour', '59 min ago', HOUR - 1],
        ['exactly an hour', '1 hour ago', HOUR],
        ['two hours', '2 hours ago', 2 * HOUR],
        ['just under a day', '23 hours ago', DAY - 1],
        ['exactly a day', '1 day ago', DAY],
        ['just under a week', '6 days ago', WEEK - 1],
        ['exactly a week', '1 week ago', WEEK],
        ['just under four weeks', '3 weeks ago', 4 * WEEK - 1],
        ['four weeks (switches to months, never "0 months")', '1 month ago', 4 * WEEK],
        ['sixty days', '2 months ago', 60 * DAY],
        ['just under a year (capped at 11 months)', '11 months ago', YEAR - 1],
        ['exactly a year', '1 year ago', YEAR],
        ['three years', '3 years ago', 3 * YEAR],
    ])('%s -> %s', (_case, expected, difference) => {
        expect(formatRelativeDate(ago(difference), NOW)).toBe(expected);
    });

    it('treats a date in the future as "just now" instead of a negative time', () => {
        expect(formatRelativeDate(ago(-DAY), NOW)).toBe('just now');
    });

    it.each(['', 'not a date'])('returns an empty string for an invalid date: "%s"', (value) => {
        expect(formatRelativeDate(value, NOW)).toBe('');
    });

    it('uses the current time when "now" is not passed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);

        expect(formatRelativeDate(ago(2 * HOUR))).toBe('2 hours ago');
    });
});
