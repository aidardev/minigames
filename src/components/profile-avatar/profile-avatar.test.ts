// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ProfileAvatar } from './profile-avatar';

const URL = 'https://example.com/photo.png';

function createAvatar(): ProfileAvatar {
    return new ProfileAvatar();
}

function image(avatar: ProfileAvatar): HTMLImageElement | null {
    return avatar.element.querySelector('img');
}

describe('ProfileAvatar', () => {
    it('shows the photo when an avatarUrl is given', () => {
        const avatar = createAvatar();

        avatar.update({ avatarUrl: URL, initials: 'AD' });

        expect(image(avatar)?.getAttribute('src')).toBe(URL);
        expect(image(avatar)?.getAttribute('referrerpolicy')).toBe('no-referrer');
        expect(avatar.element.textContent).toBe('');
    });

    it('shows initials when there is no avatarUrl', () => {
        const avatar = createAvatar();

        avatar.update({ avatarUrl: undefined, initials: 'AD' });

        expect(image(avatar)).toBeNull();
        expect(avatar.element.textContent).toBe('AD');
    });

    it('treats an empty avatarUrl as absent', () => {
        const avatar = createAvatar();

        avatar.update({ avatarUrl: '', initials: 'A' });

        expect(image(avatar)).toBeNull();
        expect(avatar.element.textContent).toBe('A');
    });

    it('falls back to initials when the photo fails to load', () => {
        const avatar = createAvatar();
        avatar.update({ avatarUrl: URL, initials: 'AD' });

        image(avatar)?.dispatchEvent(new Event('error'));

        expect(image(avatar)).toBeNull();
        expect(avatar.element.textContent).toBe('AD');
    });

    it('falls back to the generic icon when the photo fails and there are no initials', () => {
        const avatar = createAvatar();
        avatar.update({ avatarUrl: URL, initials: '' });

        image(avatar)?.dispatchEvent(new Event('error'));

        expect(image(avatar)).toBeNull();
        expect(avatar.element.querySelector('svg')).not.toBeNull();
    });

    it('shows the generic icon when there is neither a photo nor initials', () => {
        const avatar = createAvatar();

        avatar.update({ avatarUrl: undefined, initials: '' });

        expect(avatar.element.querySelector('svg')).not.toBeNull();
    });

    it('ignores a late error of a photo that was already replaced', () => {
        const avatar = createAvatar();
        avatar.update({ avatarUrl: URL, initials: 'AD' });
        const stale = image(avatar);

        avatar.update({ avatarUrl: 'https://example.com/new.png', initials: 'AD' });
        stale?.dispatchEvent(new Event('error'));

        expect(image(avatar)?.getAttribute('src')).toBe('https://example.com/new.png');
    });

    it('is hidden from assistive technology', () => {
        expect(createAvatar().element.getAttribute('aria-hidden')).toBe('true');
    });
});
