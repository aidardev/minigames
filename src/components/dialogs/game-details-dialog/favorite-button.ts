import { getErrorMessage } from '@/api/api-error';
import { toggleFavorite } from '@/api/favorites';
import { requireSession } from '@/app/require-auth';
import heartIcon from '@/assets/icons/favorite.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { Favorite } from '@/types/game-details.types';
import { html, unsafeHtml } from '@/utils/html';

const GUEST_MESSAGE = 'Sign in to add games to your favorites.';

export interface FavoriteButtonProperties {
    slug: string;
    isFavorited: boolean;
    onChange: (state: Favorite) => void;
}

export class FavoriteButton extends BaseComponent<'button'> {
    private readonly slug: string;
    private readonly onChange: (state: Favorite) => void;
    private isFavorited: boolean;
    private isPending = false;

    private readonly handleClick = (): void => {
        void this.toggle();
    };

    constructor({ slug, isFavorited, onChange }: FavoriteButtonProperties) {
        super('button', 'game-details__favorite btn btn--large');

        this.slug = slug;
        this.isFavorited = isFavorited;
        this.onChange = onChange;

        this.element.type = 'button';
        this.setHtml(html`${unsafeHtml(heartIcon)}<span data-favorite-label></span>`);

        this.element.addEventListener('click', this.handleClick);
        this.render();
    }

    private render(): void {
        this.element.setAttribute('aria-pressed', String(this.isFavorited));
        this.element.classList.toggle('is-active', this.isFavorited);

        const label = this.getElement('[data-favorite-label]');
        label.textContent = this.isFavorited ? 'Remove from Favorites' : 'Add to Favorites';
    }

    private setPending(isPending: boolean): void {
        this.isPending = isPending;
        this.element.disabled = isPending;
        this.element.classList.toggle('is-loading', isPending);
        this.element.setAttribute('aria-busy', String(isPending));
    }

    private async toggle(): Promise<void> {
        if (this.isPending) return;

        const session = requireSession(GUEST_MESSAGE);
        if (!session) return;

        this.setPending(true);

        try {
            const state = await toggleFavorite(this.slug, session.email);

            this.isFavorited = state.isFavorited;
            this.render();
            this.onChange(state);
        } catch (error) {
            showSnackbar(getErrorMessage(error), 'error');
        } finally {
            this.setPending(false);
        }
    }
}
