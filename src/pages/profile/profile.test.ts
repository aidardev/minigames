// @vitest-environment jsdom

import { openAuth, openGameDetails } from '@/app/navigation';
import { listCollections, listItems } from '@/services/collections/collections-repo';
import { collectionsStore } from '@/services/collections/collections-store';
import { waitForAuthUid } from '@/services/firebase/firebase';
import { appSession } from '@/services/session/app-session';
import type { AppSession, SessionListener } from '@/services/session/session.types';
import type { Collection, CollectionItem } from '@/types/collection.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './profile';

vi.mock('@/app/navigation', () => ({
    openAuth: vi.fn(),
    openCreateCollection: vi.fn(),
    openGameDetails: vi.fn(),
}));
vi.mock('@/services/firebase/firebase', () => ({ waitForAuthUid: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({ appSession: { subscribe: vi.fn() } }));
vi.mock('@/services/collections/collections-repo', () => ({
    listCollections: vi.fn(),
    listItems: vi.fn(),
}));

const USER: AppSession = {
    uid: 'user-1',
    displayName: 'Alex',
    email: 'alex@example.com',
    authenticatedAt: Date.now(),
};
const COLLECTION: Collection = {
    id: 'collection-1',
    name: 'My puzzles',
    description: 'Games from Firestore',
    itemsCount: 1,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-02T12:00:00Z'),
};
const OTHER_COLLECTION: Collection = { ...COLLECTION, id: 'collection-2', name: 'Play later' };
const GAME: CollectionItem = {
    slug: 'cozy-sudoku',
    title: 'Cozy Sudoku',
    image: '/saved-sudoku.jpg',
    addedAt: new Date('2026-01-01T12:00:00Z'),
};
const OTHER_GAME: CollectionItem = { ...GAME, slug: 'cat-chess', title: 'Cat Chess' };

const sessionListeners = new Set<SessionListener>();
const pages: ProfilePage[] = [];
const authState: { session: AppSession | undefined } = { session: undefined };

function setSession(value: AppSession | undefined): void {
    authState.session = value;
    // Match index.ts: the store receives an account change before page subscribers.
    collectionsStore.setUser(value?.uid);
    for (const listener of sessionListeners) listener(value);
}

function mount(value: AppSession | undefined): ProfilePage {
    setSession(value);
    const page = new ProfilePage();
    pages.push(page);
    document.body.append(page.element);
    return page;
}

async function waitForGames(page: ProfilePage, count = 3): Promise<void> {
    await vi.waitFor(() => {
        expect(page.element.querySelectorAll('button.collection-game__inner')).toHaveLength(count);
    });
}

async function flushRequests(): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
}

describe('ProfilePage', () => {
    beforeEach(() => {
        collectionsStore.setUser(undefined);
        authState.session = undefined;
        sessionListeners.clear();
        vi.resetAllMocks();
        vi.mocked(waitForAuthUid).mockImplementation(async () => authState.session?.uid);
        vi.mocked(listCollections).mockResolvedValue([COLLECTION, OTHER_COLLECTION]);
        vi.mocked(listItems).mockImplementation(async (_uid, id) =>
            id === COLLECTION.id ? [GAME] : [GAME, OTHER_GAME],
        );
        vi.mocked(appSession.subscribe).mockImplementation((listener) => {
            sessionListeners.add(listener);
            listener(authState.session);
            return (): void => {
                sessionListeners.delete(listener);
            };
        });
    });

    afterEach(() => {
        for (const page of pages) page.destroy();
        pages.length = 0;
        collectionsStore.setUser(undefined);
        document.body.replaceChildren();
    });

    it('offers sign-in to guests without reading private collections', () => {
        const page = mount(undefined);

        expect(page.element.textContent).toContain('Sign in to view your profile');
        page.element.querySelector<HTMLButtonElement>('.empty-state__btn')?.click();

        expect(openAuth).toHaveBeenCalledExactlyOnceWith('login');
        expect(listCollections).not.toHaveBeenCalled();
        expect(listItems).not.toHaveBeenCalled();
    });

    it('shows the real identity immediately and skeletons while collections are loading', async () => {
        const pending = Promise.withResolvers<Collection[]>();
        vi.mocked(listCollections).mockReturnValue(pending.promise);
        const page = mount(USER);

        expect(page.element.querySelector('#profile-name')?.textContent).toBe(USER.displayName);
        expect(page.element.querySelector('[data-profile-email]')?.textContent).toBe(USER.email);
        expect(page.element.querySelector('.profile-avatar')?.textContent).toBe('A');
        expect(page.element.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
        expect(page.element.querySelector('[data-games-count]')?.getAttribute('aria-busy')).toBe(
            'true',
        );
        expect(page.element.textContent).not.toContain('No collections yet');
        expect(listItems).not.toHaveBeenCalled();

        pending.resolve([]);
        await vi.waitFor(() => expect(page.element.textContent).toContain('No collections yet'));
    });

    it('renders stored collections and game snapshots, counting unique games across collections', async () => {
        const page = mount(USER);
        await waitForGames(page);

        expect(listItems).toHaveBeenCalledWith(USER.uid, COLLECTION.id);
        expect(listItems).toHaveBeenCalledWith(USER.uid, OTHER_COLLECTION.id);
        expect(page.element.textContent).toContain(COLLECTION.name);
        expect(page.element.textContent).toContain(COLLECTION.description);
        expect(page.element.querySelector('time')?.dateTime).toBe(
            COLLECTION.updatedAt.toISOString(),
        );
        expect(page.element.querySelector('.collection-game__image')?.getAttribute('src')).toBe(
            GAME.image,
        );
        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('2');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
        expect(page.element.querySelectorAll('.skeleton')).toHaveLength(0);

        page.element.querySelector<HTMLButtonElement>('.collection-game__inner')?.click();
        expect(openGameDetails).toHaveBeenCalledExactlyOnceWith(GAME.slug);
    });

    it('keeps the same connected skeleton and game-count placeholder across both loading stages', async () => {
        const metadata = Promise.withResolvers<Collection[]>();
        const games = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockReturnValue(metadata.promise);
        vi.mocked(listItems).mockReturnValue(games.promise);
        const page = mount(USER);
        const skeleton = page.element.querySelector('.profile-collections');
        const placeholder = page.element.querySelector(':scope [data-games-count] .skeleton');
        expect(skeleton).not.toBeNull();
        expect(placeholder).not.toBeNull();
        const removed: Node[] = [];
        const observer = new MutationObserver((records) => {
            removed.push(...records.flatMap((record) => [...record.removedNodes]));
        });
        observer.observe(page.element, { childList: true, subtree: true });

        try {
            const reload = collectionsStore.reload();
            metadata.resolve([COLLECTION]);
            await reload;
            await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());

            expect(page.element.querySelector('.profile-collections')).toBe(skeleton);
            expect(page.element.querySelector(':scope [data-games-count] .skeleton')).toBe(
                placeholder,
            );
            expect(skeleton?.isConnected).toBe(true);
            expect(
                removed.some((node) => node.contains(skeleton) || node.contains(placeholder)),
            ).toBe(false);
            expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('1');
            expect(page.element.querySelector('[aria-busy="true"]')).not.toBeNull();
        } finally {
            observer.disconnect();
            games.resolve([GAME]);
        }

        await waitForGames(page, 1);
        expect(page.element.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it.each(['same array', 'equal copy'] as const)(
        'reloads all games after an unchanged collection list is refreshed: %s',
        async (result) => {
            const collections = [COLLECTION, OTHER_COLLECTION];
            vi.mocked(listCollections).mockResolvedValue(collections);
            const page = mount(USER);
            await waitForGames(page);
            const card = page.element.querySelector('.collection-game');
            const metadata = Promise.withResolvers<Collection[]>();
            const games = Promise.withResolvers<CollectionItem[]>();
            vi.mocked(listCollections).mockReturnValueOnce(metadata.promise);
            vi.mocked(listItems).mockReturnValue(games.promise);

            const reload = collectionsStore.reload();
            expect(listItems).toHaveBeenCalledTimes(2);
            metadata.resolve(
                result === 'same array'
                    ? collections
                    : collections.map((collection) => ({ ...collection })),
            );
            await reload;

            expect(listItems).toHaveBeenCalledTimes(4);
            expect(listItems).toHaveBeenNthCalledWith(3, USER.uid, COLLECTION.id);
            expect(listItems).toHaveBeenNthCalledWith(4, USER.uid, OTHER_COLLECTION.id);
            expect(page.element.querySelector('.collection-game')).toBe(card);
            expect(card?.isConnected).toBe(true);
            expect(page.element.querySelectorAll('.skeleton')).toHaveLength(0);
            expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');

            games.resolve([OTHER_GAME]);
            await waitForGames(page, 2);

            expect(page.element.textContent).not.toContain(GAME.title);
            expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('1');
            expect(page.element.querySelector('[aria-busy="true"]')).toBeNull();
        },
    );

    it('restarts pending game reads after a successful list refresh without replacing the skeleton', async () => {
        const oldGames = Promise.withResolvers<CollectionItem[]>();
        const newGames = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        vi.mocked(listItems)
            .mockReturnValueOnce(oldGames.promise)
            .mockReturnValueOnce(newGames.promise);
        const page = mount(USER);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());
        const skeleton = page.element.querySelector('.profile-collections');
        vi.mocked(listCollections).mockResolvedValue([{ ...COLLECTION }]);

        await collectionsStore.reload();
        expect(listItems).toHaveBeenCalledTimes(2);
        expect(page.element.querySelector('.profile-collections')).toBe(skeleton);

        newGames.resolve([OTHER_GAME]);
        await waitForGames(page, 1);
        oldGames.resolve([GAME]);
        await flushRequests();
        expect(page.element.textContent).toContain(OTHER_GAME.title);
        expect(page.element.textContent).not.toContain(GAME.title);
    });

    it('keeps a complete snapshot until changed collections finish loading', async () => {
        const page = mount(USER);
        await waitForGames(page);
        const card = page.element.querySelector('.collection-game');
        const pending = Promise.withResolvers<CollectionItem[]>();
        const updated = { ...COLLECTION, name: 'Updated collection', itemsCount: 2 };
        vi.mocked(listCollections).mockResolvedValue([updated, OTHER_COLLECTION]);
        vi.mocked(listItems).mockReturnValueOnce(pending.promise);

        await collectionsStore.reload();
        expect(page.element.querySelector('.collection-game')).toBe(card);
        expect(page.element.textContent).toContain(COLLECTION.name);
        expect(page.element.textContent).not.toContain(updated.name);
        expect(page.element.querySelectorAll('.skeleton')).toHaveLength(0);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
        expect(listItems).toHaveBeenCalledTimes(4);

        pending.resolve([GAME, OTHER_GAME]);
        await waitForGames(page, 4);
        expect(page.element.textContent).toContain(updated.name);
        expect(page.element.querySelector('[aria-busy="true"]')).toBeNull();
    });

    it('refreshes games when the collection timestamp changes even if its item count stays the same', async () => {
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        const page = mount(USER);
        await waitForGames(page, 1);
        vi.mocked(listCollections).mockResolvedValue([
            { ...COLLECTION, updatedAt: new Date('2026-01-03T12:00:00Z') },
        ]);
        vi.mocked(listItems).mockResolvedValue([OTHER_GAME]);

        await collectionsStore.reload();
        await vi.waitFor(() => expect(page.element.textContent).toContain(OTHER_GAME.title));

        expect(page.element.textContent).not.toContain(GAME.title);
        expect(listItems).toHaveBeenCalledTimes(2);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('1');
    });

    it('retains the previous snapshot on a game refresh error and retries all collections', async () => {
        const page = mount(USER);
        await waitForGames(page);
        const card = page.element.querySelector('.collection-game');
        const updated = { ...COLLECTION, name: 'Changed collection' };
        vi.mocked(listCollections).mockResolvedValue([updated, OTHER_COLLECTION]);
        vi.mocked(listItems)
            .mockRejectedValueOnce(new Error('Offline'))
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([OTHER_GAME])
            .mockResolvedValueOnce([]);

        await collectionsStore.reload();
        await vi.waitFor(() => expect(page.element.querySelector('.error-banner')).not.toBeNull());
        expect(page.element.querySelector('.collection-game')).toBe(card);
        expect(page.element.textContent).not.toContain(updated.name);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
        expect(listItems).toHaveBeenCalledTimes(4);

        page.element.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();
        expect(page.element.querySelector('.collection-game')).toBe(card);
        await vi.waitFor(() => expect(page.element.textContent).toContain(updated.name));

        expect(page.element.querySelector('.error-banner')).toBeNull();
        expect(listCollections).toHaveBeenCalledTimes(2);
        expect(listItems).toHaveBeenCalledTimes(6);
        expect(listItems).toHaveBeenNthCalledWith(5, USER.uid, COLLECTION.id);
        expect(listItems).toHaveBeenNthCalledWith(6, USER.uid, OTHER_COLLECTION.id);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('1');
    });

    it('uses the collection empty design for an account without collections', async () => {
        vi.mocked(listCollections).mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() => expect(page.element.textContent).toContain('No collections yet'));

        expect(page.element.querySelector('.collection-section__empty')).not.toBeNull();
        expect(
            page.element.querySelector('.collection-section__browse')?.getAttribute('href'),
        ).toBe('/library');
        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('0');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('0');
        expect(listItems).not.toHaveBeenCalled();
    });

    it.each([undefined, 100])(
        'uses loaded games for collection counts when the cached count is %s',
        async (itemsCount) => {
            vi.mocked(listCollections).mockResolvedValue([{ ...COLLECTION, itemsCount }]);
            vi.mocked(listItems).mockResolvedValue([GAME, OTHER_GAME]);
            const page = mount(USER);
            await waitForGames(page, 2);

            expect(
                page.element.querySelector('.collection-section__count')?.textContent?.trim(),
            ).toBe('2 games');
            expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('1');
            expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
            expect(page.element.querySelector('.error-banner')).toBeNull();
        },
    );

    it('keeps the individual empty collection state after a successful empty items response', async () => {
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        vi.mocked(listItems).mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() =>
            expect(page.element.textContent).toContain('Start with something you love'),
        );

        expect(page.element.textContent).toContain(COLLECTION.name);
        expect(page.element.textContent).not.toContain('No collections yet');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('0');
    });

    it('preserves a loaded empty result and zero counts through refresh failure and retry', async () => {
        vi.mocked(listCollections).mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() => expect(page.element.textContent).toContain('No collections yet'));
        const empty = page.element.querySelector('.profile-collections');
        const pending = Promise.withResolvers<Collection[]>();
        vi.mocked(listCollections).mockReturnValueOnce(pending.promise);

        const reload = collectionsStore.reload();
        expect(page.element.querySelector('.profile-collections')).toBe(empty);
        expect(page.element.querySelectorAll('.skeleton')).toHaveLength(0);
        pending.reject(new Error('Offline'));
        await reload;

        expect(page.element.querySelector('.error-banner')).not.toBeNull();
        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('0');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('0');
        page.element.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();
        expect(page.element.querySelector('.profile-collections')).toBe(empty);
        await vi.waitFor(() => expect(page.element.querySelector('.error-banner')).toBeNull());
        await flushRequests();

        expect(page.element.textContent).toContain('No collections yet');
        expect(listItems).not.toHaveBeenCalled();
    });

    it('shows an empty snapshot after the last collection is removed', async () => {
        const page = mount(USER);
        await waitForGames(page);
        vi.mocked(listCollections).mockResolvedValue([]);

        await collectionsStore.reload();
        await vi.waitFor(() => expect(page.element.textContent).toContain('No collections yet'));

        expect(page.element.querySelector('.collection-game')).toBeNull();
        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('0');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('0');
        expect(listItems).toHaveBeenCalledTimes(2);
    });

    it('retries collection-list errors through the store without displaying a false zero', async () => {
        vi.mocked(listCollections)
            .mockRejectedValueOnce(new Error('permission-denied'))
            .mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() => expect(page.element.querySelector('.error-banner')).not.toBeNull());

        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('—');
        expect(page.element.textContent).not.toContain('permission-denied');
        page.element.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();
        expect(page.element.querySelectorAll('.skeleton').length).toBeGreaterThan(0);

        await vi.waitFor(() => expect(page.element.textContent).toContain('No collections yet'));
        expect(listCollections).toHaveBeenCalledTimes(2);
    });

    it('retries game-loading errors locally without reloading the shared collection list', async () => {
        vi.mocked(listItems).mockRejectedValueOnce(new Error('Network unavailable'));
        const page = mount(USER);
        await vi.waitFor(() => expect(page.element.querySelector('.error-banner')).not.toBeNull());

        expect(page.element.querySelector('[data-collections-count]')?.textContent).toBe('2');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('—');
        page.element.querySelector<HTMLButtonElement>('.error-banner__retry')?.click();
        await waitForGames(page);

        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
        expect(listCollections).toHaveBeenCalledOnce();
        expect(listItems).toHaveBeenCalledTimes(4);
    });

    it('preserves visible games and statistics when a metadata refresh fails', async () => {
        const page = mount(USER);
        await waitForGames(page);
        const card = page.element.querySelector('.collection-game');
        const pending = Promise.withResolvers<Collection[]>();
        vi.mocked(listCollections).mockReturnValueOnce(pending.promise);

        const reload = collectionsStore.reload();
        expect(card?.isConnected).toBe(true);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');

        pending.reject(new Error('Offline'));
        await reload;

        expect(page.element.querySelector('.error-banner')).not.toBeNull();
        expect(card?.isConnected).toBe(true);
        expect(page.element.querySelectorAll('.skeleton')).toHaveLength(0);
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('2');
        expect(listItems).toHaveBeenCalledTimes(2);
    });

    it('clears identity and pending game results synchronously on logout', async () => {
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        const pending = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listItems).mockReturnValue(pending.promise);
        const page = mount(USER);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());

        setSession(undefined);

        expect(page.element.textContent).not.toContain(USER.email);
        expect(page.element.querySelector('.profile-summary')).toBeNull();
        expect(page.element.textContent).toContain('Sign in to view your profile');

        pending.resolve([GAME]);
        await flushRequests();

        expect(page.element.querySelector('.collection-game')).toBeNull();
        expect(page.element.textContent).not.toContain(GAME.title);
    });

    it('ignores old-account game results after switching to another account', async () => {
        const pending = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockResolvedValueOnce([COLLECTION]).mockResolvedValue([]);
        vi.mocked(listItems).mockReturnValue(pending.promise);
        const page = mount(USER);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());

        setSession({
            ...USER,
            uid: 'user-2',
            displayName: 'Other player',
            email: 'other@example.com',
        });

        expect(page.element.textContent).not.toContain(USER.email);
        expect(page.element.textContent).toContain('other@example.com');
        pending.resolve([GAME]);
        await flushRequests();

        expect(page.element.textContent).toContain('No collections yet');
        expect(page.element.querySelector('[data-games-count]')?.textContent).toBe('0');
        expect(page.element.textContent).not.toContain(GAME.title);
    });

    it.each(['resolve', 'reject'] as const)(
        'ignores a superseded game request that later %ss',
        async (outcome) => {
            const oldGames = Promise.withResolvers<CollectionItem[]>();
            const newGames = Promise.withResolvers<CollectionItem[]>();
            vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
            vi.mocked(listItems)
                .mockReturnValueOnce(oldGames.promise)
                .mockReturnValueOnce(newGames.promise);
            const page = mount(USER);
            await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());

            vi.mocked(listCollections).mockResolvedValue([{ ...COLLECTION, name: 'New snapshot' }]);
            await collectionsStore.reload();
            newGames.resolve([OTHER_GAME]);
            await waitForGames(page, 1);

            if (outcome === 'resolve') oldGames.resolve([GAME]);
            else oldGames.reject(new Error('Old failure'));
            await flushRequests();

            expect(page.element.textContent).toContain('New snapshot');
            expect(page.element.textContent).toContain(OTHER_GAME.title);
            expect(page.element.textContent).not.toContain(GAME.title);
            expect(page.element.querySelector('.error-banner')).toBeNull();
            expect(page.element.querySelector('[aria-busy="true"]')).toBeNull();
        },
    );

    it('ignores pending games after logout and login to the same account', async () => {
        const oldGames = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        vi.mocked(listItems).mockReturnValueOnce(oldGames.promise).mockResolvedValue([OTHER_GAME]);
        const page = mount(USER);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());

        setSession(undefined);
        setSession(USER);
        await waitForGames(page, 1);
        oldGames.resolve([GAME]);
        await flushRequests();

        expect(page.element.textContent).toContain(OTHER_GAME.title);
        expect(page.element.textContent).not.toContain(GAME.title);
        expect(page.element.querySelector('.error-banner')).toBeNull();
    });

    it('updates the same user’s identity without rebuilding or reloading collections', async () => {
        const page = mount(USER);
        await waitForGames(page);
        const card = page.element.querySelector('.collection-game');

        setSession({ ...USER, displayName: 'Updated name' });

        expect(page.element.querySelector('#profile-name')?.textContent).toBe('Updated name');
        expect(page.element.querySelector('.collection-game')).toBe(card);
        expect(listCollections).toHaveBeenCalledOnce();
        expect(listItems).toHaveBeenCalledTimes(2);
    });

    it('unsubscribes and ignores pending results when leaving the profile page', async () => {
        const pending = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        vi.mocked(listItems).mockReturnValue(pending.promise);
        const page = mount(USER);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledOnce());
        page.destroy();
        const oldContent = page.element.textContent;
        pages.length = 0;
        pending.resolve([GAME]);
        await flushRequests();
        await collectionsStore.reload();

        expect(sessionListeners.size).toBe(0);
        expect(page.element.isConnected).toBe(false);
        expect(page.element.textContent).toBe(oldContent);
        expect(listItems).toHaveBeenCalledOnce();
    });
});
