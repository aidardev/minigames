export function formatRelativeDate(value: string): string {
    const createdAt = new Date(value);
    const difference = Math.max(0, Date.now() - createdAt.getTime());

    const minutes = Math.floor(difference / 60_000);
    const hours = Math.floor(difference / 3_600_000);
    const days = Math.floor(difference / 86_400_000);

    if (minutes < 60) {
        return `${Math.max(1, minutes)} min ago`;
    }

    if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    if (days < 7) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    const weeks = Math.floor(days / 7);

    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}
