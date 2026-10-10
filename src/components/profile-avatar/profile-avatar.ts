import personIcon from '@/assets/icons/person.svg?raw';
import { html, unsafeHtml } from '@/utils/html';
import { BaseComponent } from '../base-component';
import './profile-avatar.scss';

export interface ProfileAvatarContent {
    avatarUrl: string | undefined;
    initials: string;
}

/**
 * Photo if there is one and it loads, otherwise initials, otherwise a generic icon.
 * Decorative: the name is always shown next to it or set as a label on its wrapper.
 */
export class ProfileAvatar extends BaseComponent<'span'> {
    constructor() {
        super('span', 'profile-avatar avatar');
        this.element.setAttribute('aria-hidden', 'true');
    }

    private showImage(url: string, initials: string): void {
        const image = document.createElement('img');
        image.className = 'profile-avatar__image';
        image.alt = '';
        // Google photo hosts sometimes reject requests that carry a foreign referrer.
        image.setAttribute('referrerpolicy', 'no-referrer');

        image.addEventListener(
            'error',
            (): void => {
                // A broken photo must not overwrite a newer avatar that replaced it meanwhile.
                if (this.element.firstElementChild === image) this.showFallback(initials);
            },
            { once: true },
        );

        image.src = url;
        this.element.replaceChildren(image);
    }

    private showFallback(initials: string): void {
        if (initials === '') {
            this.setHtml(html`${unsafeHtml(personIcon)}`);
            return;
        }

        this.element.textContent = initials;
    }

    public update({ avatarUrl, initials }: ProfileAvatarContent): void {
        if (avatarUrl) {
            this.showImage(avatarUrl, initials);
        } else {
            this.showFallback(initials);
        }
    }
}
