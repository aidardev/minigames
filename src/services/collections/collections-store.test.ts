import { waitForAuthUid } from '@/services/firebase/firebase';
import type { Collection } from '@/types/collection.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listCollections } from './collections-repo';
import { CollectionsStore } from './collections-store';

vi.mock('@/services/firebase/firebase', () => ({ waitForAuthUid: vi.fn() }));
vi.mock('./collections-repo', () => ({ listCollections: vi.fn() }));

const COLLECTION: Collection = {
    id: 'collection-1',
    name: 'Play later',
    description: '',
    itemsCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

describe('CollectionsStore', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(waitForAuthUid).mockResolvedValue('user-1');
        vi.mocked(listCollections).mockResolvedValue([COLLECTION]);
    });

    it('starts empty and does not load collections for a guest', async () => {
        const store = new CollectionsStore();

        store.setUser(undefined);
        await store.reload();

        expect(store.getState()).toStrictEqual({
            collections: [],
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
            collections: [],
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

        expect(store.getState().collections).toStrictEqual([]);
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
});
