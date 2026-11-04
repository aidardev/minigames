// @vitest-environment jsdom

import { openCreateCollection, setCollectionPickerOpen } from '@/app/navigation';
import { requireSession } from '@/app/require-auth';
import { showSnackbar } from '@/components/snackbar/snackbar';
import {
    addGame,
    findCollectionIdsContaining,
    listCollections,
} from '@/services/collections/collections-repo';
import { collectionsStore } from '@/services/collections/collections-store';
import { waitForAuthUid } from '@/services/firebase/firebase';
import { appSession } from '@/services/session/app-session';
import type { AppSession } from '@/services/session/session.types';
import type { Collection } from '@/types/collection.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCollectionPicker } from './game-collection-picker';

vi.mock('@/app/navigation', () => ({
    openCreateCollection: vi.fn(),
    setCollectionPickerOpen: vi.fn(),
}));
vi.mock('@/app/require-auth', () => ({ requireSession: vi.fn() }));
vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));
vi.mock('@/services/firebase/firebase', () => ({ waitForAuthUid: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({ appSession: { getActiveSession: vi.fn() } }));
vi.mock('@/services/collections/collections-repo', () => ({
    listCollections: vi.fn(),
    findCollectionIdsContaining: vi.fn(),
    addGame: vi.fn(),
}));

const USER: AppSession = { uid: 'user-1', email: 'a@b.c', displayName: 'Alex', authenticatedAt: 1 };
const GAME = { slug: 'cat-mail-co', title: 'Cat Mail Co.', image: 'https://example.com/cat.jpg' };
const COLLECTION: Collection = {
    id: 'cozy',
    name: 'Cozy games',
    description: '',
    itemsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
};
describe('GameCollectionPicker', () => {
    let session: AppSession | undefined;
    let picker: GameCollectionPicker;

    function button(selector: string): HTMLButtonElement {
        const element = picker.element.querySelector<HTMLButtonElement>(selector);
        if (!element) throw new Error(`Missing button: ${selector}`);
        return element;
    }

    async function setup(collections: Collection[] = [COLLECTION]): Promise<void> {
        vi.mocked(listCollections).mockResolvedValue(collections);
        collectionsStore.setUser(session?.uid);
        if (session)
            await vi.waitFor(() => expect(collectionsStore.getState().status).toBe('ready'));
        picker = new GameCollectionPicker(GAME, true);
        document.body.append(picker.element);
    }

    beforeEach(() => {
        vi.resetAllMocks();
        session = USER;
        vi.mocked(appSession.getActiveSession).mockImplementation(() => session);
        vi.mocked(requireSession).mockImplementation(() => session);
        vi.mocked(waitForAuthUid).mockImplementation(async () => session?.uid);
        vi.mocked(findCollectionIdsContaining).mockResolvedValue([]);
        vi.mocked(addGame).mockResolvedValue(true);
    });

    afterEach(() => {
        picker?.destroy();
        collectionsStore.setUser(undefined);
    });

    it('sends a guest to sign-in without reading private collections', async () => {
        session = undefined;
        await setup();
        expect(picker.element.querySelector<HTMLElement>('.collection-picker__panel')?.hidden).toBe(
            true,
        );
        expect(picker.element.querySelector('[data-action="sign-in"]')).toBeNull();
        expect(button('[data-action="toggle"]').getAttribute('aria-expanded')).toBe('false');
        button('[data-action="toggle"]').click();
        expect(setCollectionPickerOpen).toHaveBeenCalledWith(true);
        expect(requireSession).toHaveBeenCalledWith('Sign in to add games to your collections.');
        expect(listCollections).not.toHaveBeenCalled();
        expect(findCollectionIdsContaining).not.toHaveBeenCalled();
        expect(addGame).not.toHaveBeenCalled();
    });

    it('offers the existing creation dialog for an empty account', async () => {
        await setup([]);
        await vi.waitFor(() =>
            expect(picker.element.textContent).toContain('Create your first collection'),
        );
        button('[data-action="create"]').click();
        expect(openCreateCollection).toHaveBeenCalledOnce();
        expect(addGame).not.toHaveBeenCalled();
    });

    it('marks existing membership and saves a preview once while the write is pending', async () => {
        const pending = Promise.withResolvers<boolean>();
        vi.mocked(findCollectionIdsContaining)
            .mockResolvedValueOnce(['cozy'])
            .mockResolvedValue(['cozy', 'later']);
        vi.mocked(addGame).mockReturnValueOnce(pending.promise);
        await setup([COLLECTION, { ...COLLECTION, id: 'later', name: 'Play later' }]);
        await vi.waitFor(() => expect(picker.element.textContent).toContain('Already added'));
        expect(button('[data-collection-id="cozy"]').disabled).toBe(true);
        const target = button('[data-collection-id="later"]');
        target.click();
        target.click();
        await vi.waitFor(() =>
            expect(addGame).toHaveBeenCalledExactlyOnceWith(USER.uid, 'later', GAME),
        );
        expect(picker.element.textContent).toContain('Adding…');
        pending.resolve(true);
        await vi.waitFor(() =>
            expect(showSnackbar).toHaveBeenCalledWith('Game added to collection.', 'success'),
        );
        await vi.waitFor(() =>
            expect(button('[data-collection-id="later"]').textContent).toContain('Already added'),
        );
        expect(listCollections).toHaveBeenCalledTimes(2);

        button('[data-action="toggle"]').click();
        expect(setCollectionPickerOpen).toHaveBeenCalledWith(false);
    });

    it('allows retrying failed membership reads and failed writes', async () => {
        vi.mocked(findCollectionIdsContaining).mockRejectedValueOnce(new Error('Offline'));
        vi.mocked(addGame).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(false);
        await setup();
        await vi.waitFor(() =>
            expect(picker.element.querySelector('.error-banner')).not.toBeNull(),
        );
        button('.error-banner__retry').click();
        await vi.waitFor(() => expect(picker.element.textContent).toContain('Add game'));
        button('[data-collection-id="cozy"]').click();
        await vi.waitFor(() =>
            expect(showSnackbar).toHaveBeenCalledWith(
                'Your game could not be added. Please try again.',
                'error',
            ),
        );
        expect(button('[data-collection-id="cozy"]').disabled).toBe(false);
        expect(listCollections).toHaveBeenCalledOnce();

        button('[data-collection-id="cozy"]').click();
        await vi.waitFor(() =>
            expect(showSnackbar).toHaveBeenCalledWith(
                'This game is already in the collection.',
                'info',
            ),
        );
        expect(addGame).toHaveBeenCalledTimes(2);
    });

    it('clears private data and ignores an old membership response after changing accounts', async () => {
        const pending = Promise.withResolvers<string[]>();
        vi.mocked(findCollectionIdsContaining).mockReturnValueOnce(pending.promise);
        await setup();
        session = { ...USER, uid: 'user-2' };
        vi.mocked(listCollections).mockResolvedValue([]);
        collectionsStore.setUser(session.uid);
        pending.resolve(['cozy']);
        await vi.waitFor(() =>
            expect(picker.element.textContent).toContain('Create your first collection'),
        );
        expect(picker.element.textContent).not.toContain('Cozy games');
        expect(picker.element.textContent).not.toContain('Already added');
    });

    it('does not show a late save result after the picker is destroyed', async () => {
        const pending = Promise.withResolvers<boolean>();
        vi.mocked(addGame).mockReturnValueOnce(pending.promise);
        await setup();
        await vi.waitFor(() => expect(picker.element.textContent).toContain('Add game'));
        button('[data-collection-id="cozy"]').click();
        await vi.waitFor(() => expect(addGame).toHaveBeenCalledOnce());
        picker.destroy();
        pending.resolve(true);
        await vi.waitFor(() => expect(listCollections).toHaveBeenCalledTimes(2));
        expect(showSnackbar).not.toHaveBeenCalled();
    });
});
