// @vitest-environment jsdom

import { openAuth, openEditCollection, openGameDetails } from '@/app/navigation';
import {
    listCollections,
    listItems,
    updateCollection,
} from '@/services/collections/collections-repo';
import { collectionsStore } from '@/services/collections/collections-store';
import { waitForAuthUid } from '@/services/firebase/firebase';
import { appSession } from '@/services/session/app-session';
import type { AppSession, SessionListener } from '@/services/session/session.types';
import type { Collection, CollectionItem } from '@/types/collection.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionPage } from './collection';

vi.mock('@/app/navigation', () => ({
    openAuth: vi.fn(),
    openEditCollection: vi.fn(),
    openGameDetails: vi.fn(),
}));
vi.mock('@/services/firebase/firebase', () => ({ waitForAuthUid: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({ appSession: { subscribe: vi.fn() } }));
vi.mock('@/services/collections/collections-repo', () => ({
    listCollections: vi.fn(),
    listItems: vi.fn(),
    updateCollection: vi.fn(),
}));

const USER: AppSession = {
    uid: 'user-1',
    email: 'alex@example.com',
    displayName: 'Alex',
    authenticatedAt: 1,
};
const COLLECTION: Collection = {
    id: 'cozy',
    name: 'Cozy evenings',
    description: 'Games for a quiet evening',
    itemsCount: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
};
const GAME: CollectionItem = {
    slug: 'cat-mail-co',
    title: 'Cat Mail Co.',
    image: '/cat.jpg',
    addedAt: new Date(),
};
const sessionState = { current: undefined as AppSession | undefined };
const listeners = new Set<SessionListener>();
const pages: CollectionPage[] = [];

function setSession(session: AppSession | undefined): void {
    sessionState.current = session;
    collectionsStore.setUser(session?.uid);
    for (const listener of listeners) listener(session);
}

function mount(session: AppSession | undefined): CollectionPage {
    setSession(session);
    const page = new CollectionPage(new URLSearchParams(), { id: COLLECTION.id });
    pages.push(page);
    document.body.append(page.element);
    return page;
}

async function waitForContent(page: CollectionPage): Promise<void> {
    await vi.waitFor(() => expect(page.element.querySelector('.collection-game')).not.toBeNull());
}

function retry(page: CollectionPage): void {
    const button = page.element.querySelector<HTMLButtonElement>('.error-banner__retry');
    if (!button) throw new Error('Missing retry button');
    button.click();
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(waitForAuthUid).mockImplementation(async () => sessionState.current?.uid);
    vi.mocked(listCollections).mockResolvedValue([COLLECTION, { ...COLLECTION, id: 'other' }]);
    vi.mocked(listItems).mockResolvedValue([GAME]);
    vi.mocked(appSession.subscribe).mockImplementation((listener) => {
        listeners.add(listener);
        listener(sessionState.current);
        return (): void => {
            listeners.delete(listener);
        };
    });
});

afterEach(() => {
    for (const page of pages) page.destroy();
    pages.length = 0;
    collectionsStore.setUser(undefined);
    sessionState.current = undefined;
    listeners.clear();
    document.body.replaceChildren();
});

describe('CollectionPage', () => {
    it('offers sign-in to a guest without loading private data', () => {
        const page = mount(undefined);
        expect(page.element.textContent).toContain('Sign in to view this collection');
        page.element.querySelector<HTMLButtonElement>('.empty-state__btn')?.click();
        expect(openAuth).toHaveBeenCalledExactlyOnceWith('login');
        expect(listCollections).not.toHaveBeenCalled();
        expect(listItems).not.toHaveBeenCalled();
    });

    it('keeps one skeleton across both loads and renders only the selected collection with working actions', async () => {
        const metadata = Promise.withResolvers<Collection[]>();
        const items = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listCollections).mockReturnValueOnce(metadata.promise);
        vi.mocked(listItems).mockReturnValueOnce(items.promise);
        const page = mount(USER);
        const skeleton = page.element.querySelector('.collection-page__skeleton');
        expect(skeleton).not.toBeNull();
        metadata.resolve([COLLECTION, { ...COLLECTION, id: 'other', name: 'Other games' }]);
        await vi.waitFor(() =>
            expect(listItems).toHaveBeenCalledExactlyOnceWith(USER.uid, COLLECTION.id),
        );
        expect(page.element.querySelector('.collection-page__skeleton')).toBe(skeleton);
        items.resolve([GAME]);
        await waitForContent(page);
        expect(page.element.querySelector('.collection-section__title')?.tagName).toBe('H1');
        expect(page.element.querySelector('.collection-section__title')?.textContent).toBe(
            COLLECTION.name,
        );
        expect(page.element.textContent).toContain(COLLECTION.description);
        expect(page.element.textContent).not.toContain('Other games');
        expect(page.element.querySelector('.collection-section--full')).not.toBeNull();
        expect(page.element.querySelector('.collection-page__back')?.getAttribute('href')).toBe(
            '/profile',
        );
        page.element.querySelector<HTMLButtonElement>('.collection-game__inner')?.click();
        page.element.querySelector<HTMLButtonElement>('.collection-section__edit')?.click();
        expect(openGameDetails).toHaveBeenCalledExactlyOnceWith(GAME.slug);
        expect(openEditCollection).toHaveBeenCalledExactlyOnceWith(COLLECTION.id);
    });

    it('keeps the header and edit action for an empty collection', async () => {
        vi.mocked(listItems).mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() =>
            expect(page.element.querySelector('.collection-section__empty')).not.toBeNull(),
        );
        expect(page.element.textContent).toContain(COLLECTION.name);
        expect(page.element.querySelector('.collection-section__count')?.textContent?.trim()).toBe(
            '0 games',
        );
        expect(page.element.querySelector('.collection-section__edit')).not.toBeNull();
    });

    it('shows not found after a successful list response without requesting games', async () => {
        vi.mocked(listCollections).mockResolvedValue([]);
        const page = mount(USER);
        await vi.waitFor(() =>
            expect(page.element.textContent).toContain('Collection not found or unavailable'),
        );
        expect(listItems).not.toHaveBeenCalled();
        expect(page.element.querySelector('.collection-section__edit')).toBeNull();
    });

    it('separates loading errors from missing data and retries each failed stage', async () => {
        vi.mocked(listCollections).mockRejectedValueOnce(new Error('Offline'));
        vi.mocked(listItems).mockRejectedValueOnce(new Error('Offline'));
        const page = mount(USER);
        await vi.waitFor(() =>
            expect(page.element.textContent).toContain('This collection could not be loaded.'),
        );
        expect(page.element.textContent).not.toContain('Collection not found');
        retry(page);
        await vi.waitFor(() =>
            expect(page.element.textContent).toContain(
                'The games in this collection could not be loaded.',
            ),
        );
        retry(page);
        await waitForContent(page);
        expect(listCollections).toHaveBeenCalledTimes(2);
        expect(listItems).toHaveBeenCalledTimes(2);
        expect(page.element.querySelector('.error-banner')).toBeNull();
    });

    it('keeps the complete view until updated metadata and games have finished loading', async () => {
        const page = mount(USER);
        await waitForContent(page);
        const card = page.element.querySelector('.collection-game');
        const items = Promise.withResolvers<CollectionItem[]>();
        const values = { name: 'New name', description: 'New description' };
        vi.mocked(updateCollection).mockResolvedValueOnce(undefined);
        vi.mocked(listCollections).mockResolvedValueOnce([{ ...COLLECTION, ...values }]);
        vi.mocked(listItems).mockReturnValueOnce(items.promise);

        await collectionsStore.update(COLLECTION.id, values);
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledTimes(2));
        expect(page.element.querySelector('.collection-game')).toBe(card);
        expect(page.element.textContent).toContain(COLLECTION.name);
        expect(page.element.querySelector('.skeleton')).toBeNull();
        items.resolve([GAME]);
        await vi.waitFor(() =>
            expect(page.element.querySelector('.collection-section__title')?.textContent).toBe(
                values.name,
            ),
        );
        expect(page.element.textContent).toContain(values.description);
    });

    it('clears the previous account immediately and ignores its pending game response', async () => {
        const page = mount(USER);
        await waitForContent(page);
        const oldItems = Promise.withResolvers<CollectionItem[]>();
        vi.mocked(listItems).mockReturnValueOnce(oldItems.promise);
        await collectionsStore.reload();
        await vi.waitFor(() => expect(listItems).toHaveBeenCalledTimes(2));

        setSession(undefined);
        expect(page.element.textContent).not.toContain(COLLECTION.name);
        expect(page.element.querySelector('.collection-game')).toBeNull();
        vi.mocked(listCollections).mockResolvedValue([]);
        setSession({ ...USER, uid: 'user-2' });
        oldItems.resolve([GAME]);
        await vi.waitFor(() =>
            expect(page.element.textContent).toContain('Collection not found or unavailable'),
        );
        expect(page.element.querySelector('.collection-game')).toBeNull();
    });
});
