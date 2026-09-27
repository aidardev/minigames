export function toRem(px: number, base: number = 16): string {
    if (!Number.isFinite(px)) {
        throw new TypeError(`Value is not a valid number: ${px}`);
    }

    return `${px / base}rem`;
}
