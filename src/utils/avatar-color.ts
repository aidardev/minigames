export const AVATAR_COLOR_COUNT = 5;
const AVATAR_COLOR_INDICES = Array.from({ length: AVATAR_COLOR_COUNT }, (_, index) => index + 1);

export class AvatarColorPicker {
    private readonly assigned = new Map<string, number>();
    private readonly available = [...AVATAR_COLOR_INDICES];

    public getIndex(name: string): number {
        const key = name.trim();
        const known = this.assigned.get(key);

        if (known !== undefined) return known;

        // Keep colors distinct until every design token has been assigned.
        const index =
            this.available.length > 0
                ? this.available.splice(Math.floor(Math.random() * this.available.length), 1)[0]!
                : Math.floor(Math.random() * AVATAR_COLOR_COUNT) + 1;
        this.assigned.set(key, index);

        return index;
    }
}
