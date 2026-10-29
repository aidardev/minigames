// @vitest-environment jsdom

import { ApiError } from '@/api/api-error';
import { toggleFavorite } from '@/api/favorites';
import { requireSession } from '@/app/require-auth';
import { showSnackbar } from '@/components/snackbar/snackbar';
import type { Favorite } from '@/types/game-details.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FavoriteButton } from './favorite-button';

vi.mock('@/api/favorites', () => ({ toggleFavorite: vi.fn() }));
vi.mock('@/app/require-auth', () => ({ requireSession: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const SESSION = {
    uid: 'user-1',
    displayName: 'Alex',
    email: 'alex@example.com',
    authenticatedAt: 1,
};
const SLUG = 'cat-mail-co';

function setup(isFavorited = false) {
    const onChange = vi.fn();
    const { element } = new FavoriteButton({ slug: SLUG, isFavorited, onChange });
    return { element, onChange };
}

describe('FavoriteButton', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requireSession).mockReturnValue(SESSION);
    });

    it.each([
        [false, 'Add to Favorites'],
        [true, 'Remove from Favorites'],
    ])('renders initial favorite state %s', (isFavorited, label) => {
        const { element } = setup(isFavorited);
        expect(element.getAttribute('aria-pressed')).toBe(String(isFavorited));
        expect(element.classList.contains('is-active')).toBe(isFavorited);
        expect(element.querySelector('[data-favorite-label]')?.textContent).toBe(label);
        expect(element.disabled).toBe(false);
    });

    it('asks a guest to sign in without sending a request or changing state', () => {
        vi.mocked(requireSession).mockReturnValue(undefined);
        const { element, onChange } = setup();
        element.click();
        expect(requireSession).toHaveBeenCalledExactlyOnceWith(
            'Sign in to add games to your favorites.',
        );
        expect(toggleFavorite).not.toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
        expect(element.disabled).toBe(false);
        expect(element.getAttribute('aria-pressed')).toBe('false');
    });

    it('locks while pending, ignores repeated events and applies the server response', async () => {
        const request = Promise.withResolvers<Favorite>();
        vi.mocked(toggleFavorite).mockReturnValue(request.promise);
        const { element, onChange } = setup();
        element.click();
        element.dispatchEvent(new MouseEvent('click'));
        expect(toggleFavorite).toHaveBeenCalledExactlyOnceWith(SLUG, SESSION.email);
        expect(element.disabled).toBe(true);
        expect(element.getAttribute('aria-busy')).toBe('true');
        expect(element.classList.contains('is-loading')).toBe(true);
        expect(element.getAttribute('aria-pressed')).toBe('false');
        expect(onChange).not.toHaveBeenCalled();

        const state = { isFavorited: true, likesCount: 9 };
        request.resolve(state);
        await vi.waitFor(() => expect(element.disabled).toBe(false));
        expect(element.getAttribute('aria-pressed')).toBe('true');
        expect(element.querySelector('[data-favorite-label]')?.textContent).toBe(
            'Remove from Favorites',
        );
        expect(element.classList.contains('is-active')).toBe(true);
        expect(element.classList.contains('is-loading')).toBe(false);
        expect(element.getAttribute('aria-busy')).toBe('false');
        expect(onChange).toHaveBeenCalledExactlyOnceWith(state);
        expect(showSnackbar).not.toHaveBeenCalled();
    });

    it.each([true, false])(
        'uses the server state when the initial state is %s',
        async (initial) => {
            const state = { isFavorited: false, likesCount: 4 };
            vi.mocked(toggleFavorite).mockResolvedValue(state);
            const { element, onChange } = setup(initial);
            element.click();
            await vi.waitFor(() => expect(onChange).toHaveBeenCalledExactlyOnceWith(state));
            expect(element.getAttribute('aria-pressed')).toBe('false');
            expect(element.classList.contains('is-active')).toBe(false);
            expect(element.querySelector('[data-favorite-label]')?.textContent).toBe(
                'Add to Favorites',
            );
        },
    );

    it.each([
        [new ApiError('Game not found', 404), 'Game not found'],
        [new Error('network failed'), 'Something went wrong. Please try again.'],
    ])('keeps state and unlocks after an error: %s', async (error, message) => {
        vi.mocked(toggleFavorite).mockRejectedValue(error);
        const { element, onChange } = setup(true);
        element.click();
        await vi.waitFor(() => expect(element.disabled).toBe(false));
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith(message, 'error');
        expect(onChange).not.toHaveBeenCalled();
        expect(element.getAttribute('aria-pressed')).toBe('true');
        expect(element.querySelector('[data-favorite-label]')?.textContent).toBe(
            'Remove from Favorites',
        );
        expect(element.classList.contains('is-loading')).toBe(false);
        expect(element.getAttribute('aria-busy')).toBe('false');
        expect(toggleFavorite).toHaveBeenCalledOnce();
    });

    it('allows retrying after a failed request', async () => {
        vi.mocked(toggleFavorite)
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ isFavorited: true, likesCount: 1 });
        const { element, onChange } = setup();
        element.click();
        await vi.waitFor(() => expect(element.disabled).toBe(false));
        element.click();
        await vi.waitFor(() => expect(onChange).toHaveBeenCalledOnce());
        expect(toggleFavorite).toHaveBeenCalledTimes(2);
        expect(element.getAttribute('aria-pressed')).toBe('true');
    });
});
