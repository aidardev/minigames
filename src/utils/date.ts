const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const MAX_WEEKS = 3;
const MAX_MONTHS = 11;

function formatAgo(value: number, unit: string): string {
    return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

export function formatRelativeDate(value: string, now: number = Date.now()): string {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return '';

    const difference = Math.max(0, now - timestamp);

    if (difference < MINUTE) return 'just now';
    if (difference < HOUR) return `${Math.floor(difference / MINUTE)} min ago`;
    if (difference < DAY) return formatAgo(Math.floor(difference / HOUR), 'hour');
    if (difference < WEEK) return formatAgo(Math.floor(difference / DAY), 'day');

    const weeks = Math.floor(difference / WEEK);
    if (weeks <= MAX_WEEKS) return formatAgo(weeks, 'week');

    if (difference < YEAR) {
        const months = Math.min(MAX_MONTHS, Math.max(1, Math.floor(difference / MONTH)));
        return formatAgo(months, 'month');
    }

    return formatAgo(Math.floor(difference / YEAR), 'year');
}
