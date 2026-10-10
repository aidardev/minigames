import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_COLOR_COUNT, AvatarColorPicker } from './avatar-color';

describe('AvatarColorPicker', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps the random value onto the first index', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        expect(new AvatarColorPicker().getIndex('alex')).toBe(1);
    });

    it('maps the random value onto the last index', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        expect(new AvatarColorPicker().getIndex('alex')).toBe(AVATAR_COLOR_COUNT);
    });

    it('always stays inside the token range', () => {
        const picker = new AvatarColorPicker();

        for (let index_ = 0; index_ < 200; index_ += 1) {
            const index = picker.getIndex(`user-${index_}`);

            expect(index).toBeGreaterThanOrEqual(1);
            expect(index).toBeLessThanOrEqual(AVATAR_COLOR_COUNT);
        }
    });

    it('keeps the color of an author while the picker lives', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        const picker = new AvatarColorPicker();
        const first = picker.getIndex('alex');

        random.mockReturnValue(0.999);

        expect(picker.getIndex('alex')).toBe(first);
    });

    it('treats names with surrounding whitespace as the same author', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        const picker = new AvatarColorPicker();
        const first = picker.getIndex('alex');

        random.mockReturnValue(0.999);

        expect(picker.getIndex('  alex ')).toBe(first);
    });

    it('picks a separate color for a new author', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        const picker = new AvatarColorPicker();
        picker.getIndex('alex');

        random.mockReturnValue(0.999);

        expect(picker.getIndex('bob')).toBe(AVATAR_COLOR_COUNT);
    });

    it('starts fresh for a new picker, like a reopened comments view', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0);
        const first = new AvatarColorPicker().getIndex('alex');

        random.mockReturnValue(0.999);

        expect(new AvatarColorPicker().getIndex('alex')).not.toBe(first);
    });
});
