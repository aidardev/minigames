export function formatNumber(value: number): string {
    return value.toLocaleString('en-US');
}

export function formatCompactNumber(value: number): string {
    if (value < 1000) {
        return value.toString();
    }

    if (value < 1_000_000) {
        const thousands = Math.floor((value / 1000) * 10) / 10;
        return `${thousands}K`;
    }

    const millions = Math.floor((value / 1_000_000) * 10) / 10;
    return `${millions}M`;
}
