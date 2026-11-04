import { waitForAuthUid } from '@/services/firebase/firebase';
import type { Collection } from '@/types/collection.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCollection, listCollections, updateCollection } from './collections-repo';
import { CollectionsStore } from './collections-store';

vi.mock('@/services/firebase/firebase', () => ({ waitForAuthUid: vi.fn() }));
vi.mock('./collections-repo', () => ({
    listCollections: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
}));

const COLLECTION: Collection = {
    id: 'collection-1',
    name: 'Play later',
    description: '',
    itemsCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

async function readyStore(): Promise<CollectionsStore> {
    const store = new CollectionsStore();
    store.setUser('user-1');
    await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
    return store;
}

describe('CollectionsStore', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(waitForAuthUid).mockResolvedValue('user-1');
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
        vi.mocked(createCollection).mockResolvedValue('new-collection');
        vi.mocked(updateCollection).mockResolvedValue(undefined);
    });

    it('starts empty and does not load collections for a guest', async () => {
        const store = new CollectionsStore();

        store.setUser(undefined);
        await store.reload();

        expect(store.getState()).toStrictEqual({
            uid: undefined,
            collections: undefined,
            status: 'idle',
            error: undefined,
        });
        expect(waitForAuthUid).not.toHaveBeenCalled();
        expect(listCollections).not.toHaveBeenCalled();
    });

    it('notifies subscribers immediately and stops after unsubscribe', async () => {
        const store = new CollectionsStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        expect(listener).toHaveBeenCalledWith(store.getState());

        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
        expect(listener).toHaveBeenLastCalledWith(store.getState());

        unsubscribe();
        listener.mockClear();
        store.setUser(undefined);

        expect(listener).not.toHaveBeenCalled();
    });

    it('waits for Firebase Auth before loading the session owner’s collections', async () => {
        const auth = Promise.withResolvers<string | undefined>();
        vi.mocked(waitForAuthUid).mockReturnValue(auth.promise);
        const store = new CollectionsStore();

        store.setUser('user-1');

        expect(store.getState().status).toBe('loading');
        expect(listCollections).not.toHaveBeenCalled();

        auth.resolve('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

        expect(listCollections).toHaveBeenCalledExactlyOnceWith('user-1');
        expect(store.getState().collections).toStrictEqual([COLLECTION]);
    });

    it('does not reload when the same user is reported again', async () => {
        const store = new CollectionsStore();
        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

        store.setUser('user-1');

        expect(listCollections).toHaveBeenCalledOnce();
        expect(store.getState().collections).toStrictEqual([COLLECTION]);
    });

    it('clears loaded data synchronously on logout', async () => {
        const store = new CollectionsStore();
        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

        store.setUser(undefined);

        expect(store.getState()).toStrictEqual({
            uid: undefined,
            collections: undefined,
            status: 'idle',
            error: undefined,
        });
    });

    it('does not query Firestore if the user leaves while Auth is restoring', async () => {
        const auth = Promise.withResolvers<string | undefined>();
        vi.mocked(waitForAuthUid).mockReturnValue(auth.promise);
        const store = new CollectionsStore();
        store.setUser('user-1');

        store.setUser(undefined);
        auth.resolve('user-1');
        await auth.promise;

        expect(listCollections).not.toHaveBeenCalled();
        expect(store.getState().status).toBe('idle');
    });

    it.each(['resolve', 'reject'] as const)(
        'ignores a stale request that %ss after logout and login to the same account',
        async (outcome) => {
            const pending = Promise.withResolvers<Collection[]>();
            vi.mocked(listCollections).mockReturnValueOnce(pending.promise);
            const store = new CollectionsStore();
            store.setUser('user-1');
            await vi.waitFor(() => expect(listCollections).toHaveBeenCalledOnce());

            store.setUser(undefined);
            vi.mocked(listCollections).mockResolvedValue([]);
            store.setUser('user-1');
            await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

            if (outcome === 'resolve') pending.resolve([COLLECTION]);
            else pending.reject(new Error('Old request failed'));
            await Promise.allSettled([pending.promise]);

            expect(store.getState()).toStrictEqual({
                uid: 'user-1',
                collections: [],
                status: 'ready',
                error: undefined,
            });
        },
    );

    it('clears the previous account immediately when switching users', async () => {
        const store = new CollectionsStore();
        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

        vi.mocked(waitForAuthUid).mockResolvedValue('user-2');
        vi.mocked(listCollections).mockResolvedValue([]);
        store.setUser('user-2');

        expect(store.getState().collections).toBeUndefined();
        expect(store.getState().uid).toBe('user-2');
        expect(store.getState().status).toBe('loading');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
        expect(listCollections).toHaveBeenLastCalledWith('user-2');
    });

    it.each([undefined, 'another-user'])(
        'reports an error without querying Firestore if Auth uid is %s',
        async (uid) => {
            vi.mocked(waitForAuthUid).mockResolvedValue(uid);
            const store = new CollectionsStore();

            store.setUser('user-1');
            await vi.waitFor(() => expect(store.getState().status).toBe('error'));

            expect(store.getState().error).toBeInstanceOf(Error);
            expect(listCollections).not.toHaveBeenCalled();
        },
    );

    it('keeps the loaded list on refresh failure and allows a retry', async () => {
        const store = new CollectionsStore();
        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
        const error = new Error('Network unavailable');
        vi.mocked(listCollections).mockRejectedValueOnce(error);

        await store.reload();

        expect(store.getState()).toStrictEqual({
            uid: 'user-1',
            collections: [COLLECTION],
            status: 'error',
            error,
        });

        await store.reload();

        expect(store.getState().status).toBe('ready');
        expect(store.getState().error).toBeUndefined();
    });

    it('keeps the newest refresh result when requests finish out of order', async () => {
        const store = new CollectionsStore();
        store.setUser('user-1');
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
        const pending = Promise.withResolvers<Collection[]>();
        vi.mocked(listCollections).mockReturnValueOnce(pending.promise).mockResolvedValue([]);

        const olderReload = store.reload();
        await vi.waitFor(() => expect(listCollections).toHaveBeenCalledTimes(2));
        await store.reload();
        pending.resolve([COLLECTION]);
        await olderReload;

        expect(store.getState().collections).toStrictEqual([]);
        expect(store.getState().status).toBe('ready');
    });

    it('distinguishes an unloaded list from a successful empty list, including refresh errors', async () => {
        const pending = Promise.withResolvers<Collection[]>();
        vi.mocked(listCollections).mockReturnValueOnce(pending.promise);
        const store = new CollectionsStore();
        store.setUser('user-1');

        expect(store.getState().uid).toBe('user-1');
        expect(store.getState().collections).toBeUndefined();
        pending.resolve([]);
        await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

        const empty = store.getState().collections;
        vi.mocked(listCollections).mockRejectedValueOnce(new Error('Offline'));
        const reload = store.reload();
        expect(store.getState().collections).toBe(empty);
        await reload;

        expect(store.getState().collections).toEqual([]);
        expect(store.getState().collections).toBe(empty);
        expect(store.getState().status).toBe('error');
    });

    describe('updates', () => {
        const input = { name: 'Updated name', description: 'Updated notes' };

        it('updates the existing record and refreshes the collection list', async () => {
            const store = await readyStore();
            vi.mocked(listCollections).mockResolvedValueOnce([{ ...COLLECTION, ...input }]);

            await expect(store.update(COLLECTION.id, input)).resolves.toBe(COLLECTION.id);
            await vi.waitFor(() =>
                expect(store.getState().collections?.[0]?.name).toBe(input.name),
            );
            expect(updateCollection).toHaveBeenCalledExactlyOnceWith(
                'user-1',
                COLLECTION.id,
                input,
            );
            expect(createCollection).not.toHaveBeenCalled();
        });

        it('keeps a successful update separate from a failed list refresh', async () => {
            const store = await readyStore();
            vi.mocked(listCollections).mockRejectedValueOnce(new Error('Refresh failed'));

            await expect(store.update(COLLECTION.id, input)).resolves.toBe(COLLECTION.id);
            await vi.waitFor(() => expect(store.getState().status).toBe('error'));
            expect(store.getState().collections).toEqual([COLLECTION]);
            expect(updateCollection).toHaveBeenCalledOnce();
        });

        it.each(['resolve', 'reject'] as const)(
            'ignores an update that %ss after logout and login to the same account',
            async (outcome) => {
                const store = await readyStore();
                const pending = Promise.withResolvers<void>();
                vi.mocked(updateCollection).mockReturnValueOnce(pending.promise);
                const saving = store.update(COLLECTION.id, input);
                await vi.waitFor(() => expect(updateCollection).toHaveBeenCalledOnce());
                store.setUser(undefined);
                store.setUser('user-1');
                await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

                if (outcome === 'resolve') pending.resolve();
                else pending.reject(new Error('Old failure'));
                await expect(saving).resolves.toBeUndefined();
                expect(listCollections).toHaveBeenCalledTimes(2);
            },
        );
    });

    describe('creation', () => {
        const input = { name: 'Cozy games', description: '' };

        it('requires an authenticated account', async () => {
            const store = new CollectionsStore();
            await expect(store.create(input)).rejects.toThrow('Sign in');
            expect(createCollection).not.toHaveBeenCalled();
        });

        it('creates for the owner and refreshes the list after the write', async () => {
            const store = await readyStore();
            const write = Promise.withResolvers<string>();
            vi.mocked(createCollection).mockReturnValueOnce(write.promise);
            vi.mocked(listCollections).mockResolvedValue([
                COLLECTION,
                { ...COLLECTION, id: 'new' },
            ]);

            const saving = store.create(input);
            await vi.waitFor(() => expect(createCollection).toHaveBeenCalledOnce());
            expect(store.getState().status).toBe('ready');
            expect(listCollections).toHaveBeenCalledOnce();
            write.resolve('new');

            await expect(saving).resolves.toBe('new');
            await vi.waitFor(() => expect(store.getState().collections).toHaveLength(2));
            expect(createCollection).toHaveBeenCalledExactlyOnceWith('user-1', input);
            expect(listCollections).toHaveBeenCalledTimes(2);
        });

        it.each([undefined, 'another-user'])(
            'does not write when Firebase Auth uid is %s',
            async (uid) => {
                const store = await readyStore();
                vi.mocked(waitForAuthUid).mockResolvedValue(uid);

                await expect(store.create(input)).rejects.toThrow('sign in again');
                expect(createCollection).not.toHaveBeenCalled();
            },
        );

        it('does not write if the session ends while waiting for Auth', async () => {
            const store = await readyStore();
            const auth = Promise.withResolvers<string | undefined>();
            vi.mocked(waitForAuthUid).mockReturnValueOnce(auth.promise);
            const saving = store.create(input);
            store.setUser(undefined);
            auth.resolve('user-1');

            await expect(saving).resolves.toBeUndefined();
            expect(createCollection).not.toHaveBeenCalled();
        });

        it('does not report a completed write as a failure when refreshing the list fails', async () => {
            const store = await readyStore();
            vi.mocked(listCollections).mockRejectedValueOnce(new Error('Refresh failed'));

            await expect(store.create(input)).resolves.toBe('new-collection');
            await vi.waitFor(() => expect(store.getState().status).toBe('error'));
            expect(store.getState().collections).toEqual([COLLECTION]);
            expect(createCollection).toHaveBeenCalledOnce();
        });

        it('returns the saved ID while the list refresh is still pending', async () => {
            const store = await readyStore();
            const refresh = Promise.withResolvers<Collection[]>();
            vi.mocked(listCollections).mockReturnValueOnce(refresh.promise);

            await expect(store.create(input)).resolves.toBe('new-collection');
            expect(store.getState().status).toBe('loading');
            refresh.resolve([COLLECTION]);
            await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
        });

        it('propagates a write failure without refreshing or clearing the list', async () => {
            const store = await readyStore();
            const previous = store.getState();
            const error = new Error('Write failed');
            vi.mocked(createCollection).mockRejectedValueOnce(error);

            await expect(store.create(input)).rejects.toBe(error);
            expect(store.getState()).toBe(previous);
            expect(listCollections).toHaveBeenCalledOnce();
        });

        it.each(['resolve', 'reject'] as const)(
            'ignores a write that %ss after switching accounts',
            async (outcome) => {
                const store = await readyStore();
                const write = Promise.withResolvers<string>();
                vi.mocked(createCollection).mockReturnValueOnce(write.promise);
                const saving = store.create(input);
                await vi.waitFor(() => expect(createCollection).toHaveBeenCalledOnce());
                vi.mocked(waitForAuthUid).mockResolvedValue('user-2');
                vi.mocked(listCollections).mockResolvedValue([]);
                store.setUser('user-2');
                await vi.waitFor(() => expect(store.getState().status).toBe('ready'));
                const current = store.getState();

                if (outcome === 'resolve') write.resolve('old-id');
                else write.reject(new Error('Old failure'));

                await expect(saving).resolves.toBeUndefined();
                expect(store.getState()).toBe(current);
                expect(listCollections).toHaveBeenCalledTimes(2);
            },
        );

        it('ignores a write from a previous login to the same account', async () => {
            const store = await readyStore();
            const write = Promise.withResolvers<string>();
            vi.mocked(createCollection).mockReturnValueOnce(write.promise);
            const saving = store.create(input);
            await vi.waitFor(() => expect(createCollection).toHaveBeenCalledOnce());
            store.setUser(undefined);
            store.setUser('user-1');
            await vi.waitFor(() => expect(store.getState().status).toBe('ready'));

            write.resolve('old-id');
            await expect(saving).resolves.toBeUndefined();
            expect(listCollections).toHaveBeenCalledTimes(2);
        });
    });
});
