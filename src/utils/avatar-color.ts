export const AVATAR_COLOR_COUNT = 5;

export class AvatarColorPicker {
    private readonly assigned = new Map<string, number>();

    public getIndex(name: string): number {
        const key = name.trim();
        const known = this.assigned.get(key);

        if (known !== undefined) return known;

        const index = Math.floor(Math.random() * AVATAR_COLOR_COUNT) + 1;
        this.assigned.set(key, index);

        return index;
    }
}
