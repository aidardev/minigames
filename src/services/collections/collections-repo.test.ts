import { FirebaseError } from 'firebase/app';
import {
    doc,
    getDoc,
    getDocs,
    getDocsFromServer,
    runTransaction,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    type Transaction,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionDeletionError, CollectionNotFoundError } from './collection-errors';
import {
    createCollection,
    deleteCollection,
    getCollection,
    listCollections,
    listItems,
    updateCollection,
} from './collections-repo';

vi.mock('@/services/firebase/firebase', () => ({ database: {} }));
vi.mock('firebase/firestore', async (importOriginal) => ({
    ...(await importOriginal<typeof import('firebase/firestore')>()),
    collection: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    getDocsFromServer: vi.fn(),
    runTransaction: vi.fn(),
    limit: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
}));

const CREATED_AT = Timestamp.fromDate(new Date('2026-01-01T12:00:00Z'));
const UPDATED_AT = Timestamp.fromDate(new Date('2026-01-02T12:00:00Z'));
const COLLECTION_DATA = {
    name: 'Play later',
    description: 'Saved games',
    itemsCount: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
};
const ITEM_DATA = {
    slug: 'sudoku',
    title: 'Sudoku',
    image: '/sudoku.jpg',
    addedAt: CREATED_AT,
};

function collectionSnapshot(
    id: string,
    data: Record<string, unknown>,
): Awaited<ReturnType<typeof getDocs>> {
    return { docs: [{ id, data: () => data }] } as unknown as Awaited<ReturnType<typeof getDocs>>;
}

describe('collections repository reads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('converts stored collection timestamps and preserves the document identity', async () => {
        vi.mocked(getDocs).mockResolvedValue(collectionSnapshot('collection-1', COLLECTION_DATA));

        await expect(listCollections('user-1')).resolves.toEqual([
            {
                ...COLLECTION_DATA,
                id: 'collection-1',
                createdAt: CREATED_AT.toDate(),
                updatedAt: UPDATED_AT.toDate(),
            },
        ]);
    });

    it.each([
        { name: undefined },
        { name: ' ' },
        { description: undefined },
        { createdAt: undefined },
        { updatedAt: undefined },
        { updatedAt: '2026-01-02' },
    ])('rejects invalid collection data instead of inventing a result: %j', async (override) => {
        vi.mocked(getDocs).mockResolvedValue(
            collectionSnapshot('collection-1', { ...COLLECTION_DATA, ...override }),
        );

        await expect(listCollections('user-1')).rejects.toThrow('Invalid collection');
    });

    it.each([undefined, '1', -1, 1.5, NaN, Infinity])(
        'loads collections with an unknown cached item count: %s',
        async (itemsCount) => {
            vi.mocked(getDocs).mockResolvedValue(
                collectionSnapshot('collection-1', { ...COLLECTION_DATA, itemsCount }),
            );

            const [collection] = await listCollections('user-1');

            expect(collection?.id).toBe('collection-1');
            expect(collection?.itemsCount).toBeUndefined();
        },
    );

    it('uses the same validation for a single collection', async () => {
        vi.mocked(getDoc).mockResolvedValue({
            id: 'collection-1',
            exists: () => true,
            data: () => ({ ...COLLECTION_DATA, updatedAt: undefined }),
        } as unknown as Awaited<ReturnType<typeof getDoc>>);

        await expect(getCollection('user-1', 'collection-1')).rejects.toThrow(
            'Invalid collection timestamp',
        );
    });

    it('converts a game snapshot using its document identity', async () => {
        vi.mocked(getDocs).mockResolvedValue(collectionSnapshot('sudoku', ITEM_DATA));

        await expect(listItems('user-1', 'collection-1')).resolves.toEqual([
            { ...ITEM_DATA, addedAt: CREATED_AT.toDate() },
        ]);
    });

    it.each([
        { slug: 'another-game' },
        { title: undefined },
        { title: '' },
        { image: undefined },
        { addedAt: undefined },
        { addedAt: { toDate: 'invalid' } },
    ])('rejects invalid game snapshots: %j', async (override) => {
        vi.mocked(getDocs).mockResolvedValue(
            collectionSnapshot('sudoku', { ...ITEM_DATA, ...override }),
        );

        await expect(listItems('user-1', 'collection-1')).rejects.toThrow('Invalid collection');
    });
});

function mockTransaction() {
    const transaction = { get: vi.fn(), delete: vi.fn(), update: vi.fn() };
    vi.mocked(runTransaction).mockImplementation((_database, action) =>
        action(transaction as unknown as Transaction),
    );
    vi.mocked(doc).mockImplementation(
        (_database, ...segments: string[]) =>
            ({ path: segments.join('/') }) as ReturnType<typeof doc>,
    );
    return transaction;
}

describe('collection creation', () => {
    beforeEach(() => vi.clearAllMocks());

    it('writes normalized fields, an empty count and server timestamps before returning the ID', async () => {
        const reference = { id: 'new-id' } as ReturnType<typeof doc>;
        vi.mocked(doc).mockReturnValue(reference);
        vi.mocked(setDoc).mockResolvedValue(undefined);

        await expect(
            createCollection('user-1', { name: '  Cozy games  ', description: '  Notes  ' }),
        ).resolves.toBe('new-id');
        expect(setDoc).toHaveBeenCalledExactlyOnceWith(reference, {
            name: 'Cozy games',
            description: 'Notes',
            itemsCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });

    it('propagates a failed write instead of returning a collection ID', async () => {
        vi.mocked(doc).mockReturnValue({ id: 'new-id' } as ReturnType<typeof doc>);
        const error = new Error('permission-denied');
        vi.mocked(setDoc).mockRejectedValueOnce(error);

        await expect(
            createCollection('user-1', { name: 'Cozy games', description: '' }),
        ).rejects.toBe(error);
    });
});

describe('collection updates', () => {
    beforeEach(() => vi.clearAllMocks());

    it('updates only metadata and the server modification time without creating a document', async () => {
        const reference = { id: 'existing-id' } as ReturnType<typeof doc>;
        vi.mocked(doc).mockReturnValue(reference);
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        await updateCollection('user-1', 'existing-id', {
            name: '  New name  ',
            description: '  New notes  ',
        });

        expect(doc).toHaveBeenCalledExactlyOnceWith(
            expect.anything(),
            'users',
            'user-1',
            'collections',
            'existing-id',
        );
        expect(updateDoc).toHaveBeenCalledExactlyOnceWith(reference, {
            name: 'New name',
            description: 'New notes',
            updatedAt: serverTimestamp(),
        });
        expect(setDoc).not.toHaveBeenCalled();
    });

    it('turns a missing document into a collection-specific error', async () => {
        vi.mocked(updateDoc).mockRejectedValueOnce(
            new FirebaseError('not-found', 'Missing document'),
        );
        await expect(
            updateCollection('user-1', 'missing-id', { name: 'Name', description: '' }),
        ).rejects.toBeInstanceOf(CollectionNotFoundError);
        expect(setDoc).not.toHaveBeenCalled();
    });

    it('preserves other update failures', async () => {
        const error = new FirebaseError('permission-denied', 'Denied');
        vi.mocked(updateDoc).mockRejectedValueOnce(error);
        await expect(
            updateCollection('user-1', 'existing-id', { name: 'Name', description: '' }),
        ).rejects.toBe(error);
    });

    it('saves metadata and unique existing game removals in one transaction', async () => {
        const transaction = mockTransaction();
        const gameReference = { path: 'users/user-1/collections/existing-id/items/sudoku' };
        transaction.get
            .mockResolvedValueOnce({ exists: () => true, data: () => ({ itemsCount: 2 }) })
            .mockResolvedValueOnce({ exists: () => true, ref: gameReference })
            .mockResolvedValueOnce({ exists: () => false });

        await updateCollection(
            'user-1',
            'existing-id',
            { name: ' New name ', description: ' Notes ' },
            ['sudoku', 'sudoku', 'gone'],
        );
        expect(runTransaction).toHaveBeenCalledOnce();
        expect(transaction.get).toHaveBeenCalledTimes(3);
        expect(transaction.delete).toHaveBeenCalledExactlyOnceWith(gameReference);
        expect(transaction.update).toHaveBeenCalledExactlyOnceWith(
            { path: 'users/user-1/collections/existing-id' },
            { name: 'New name', description: 'Notes', itemsCount: 1, updatedAt: serverTimestamp() },
        );
        expect(updateDoc).not.toHaveBeenCalled();
    });

    it('does not recreate or modify a missing collection when removing games', async () => {
        const transaction = mockTransaction();
        transaction.get.mockResolvedValueOnce({ exists: () => false });
        await expect(
            updateCollection('user-1', 'missing', { name: 'Name', description: '' }, ['sudoku']),
        ).rejects.toBeInstanceOf(CollectionNotFoundError);
        expect(transaction.update).not.toHaveBeenCalled();
        expect(transaction.delete).not.toHaveBeenCalled();
    });
});

describe('collection deletion', () => {
    beforeEach(() => vi.resetAllMocks());

    it('deletes a small collection and its games in one transaction', async () => {
        const transaction = mockTransaction();
        transaction.get.mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ itemsCount: 1 }),
        });
        vi.mocked(getDocsFromServer).mockResolvedValueOnce({
            size: 1,
            docs: [{ ref: { path: 'game-1' } }],
        } as unknown as Awaited<ReturnType<typeof getDocsFromServer>>);
        await deleteCollection('user-1', 'existing-id');
        expect(runTransaction).toHaveBeenCalledOnce();
        expect(transaction.delete).toHaveBeenCalledWith({ path: 'game-1' });
        expect(transaction.delete).toHaveBeenLastCalledWith({
            path: 'users/user-1/collections/existing-id',
        });
        expect(transaction.update).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        'keeps counters consistent across chunks, with later failure: %s',
        async (fails) => {
            const transaction = mockTransaction();
            transaction.get.mockResolvedValue({
                exists: () => true,
                data: () => ({ itemsCount: 500 }),
            });
            const documents = Array.from({ length: 500 }, (_, index) => ({
                ref: { path: `game-${index}` },
            }));
            vi.mocked(getDocsFromServer).mockResolvedValueOnce({
                empty: false,
                size: 500,
                docs: documents,
            } as unknown as Awaited<ReturnType<typeof getDocsFromServer>>);
            if (fails) vi.mocked(getDocsFromServer).mockRejectedValueOnce(new Error('Offline'));
            else
                vi.mocked(getDocsFromServer).mockResolvedValueOnce({
                    empty: true,
                    size: 0,
                    docs: [],
                } as unknown as Awaited<ReturnType<typeof getDocsFromServer>>);

            const deleting = deleteCollection('user-1', 'existing-id');
            if (fails) await expect(deleting).rejects.toBeInstanceOf(CollectionDeletionError);
            else await deleting;
            expect(transaction.update).toHaveBeenCalledExactlyOnceWith(
                { path: 'users/user-1/collections/existing-id' },
                { itemsCount: 1, updatedAt: serverTimestamp() },
            );
            expect(transaction.delete).toHaveBeenCalledWith(documents[0]?.ref);
            expect(transaction.delete).toHaveBeenCalledWith(documents[1]?.ref);
            if (fails) expect(transaction.delete).toHaveBeenCalledTimes(499);
            else
                expect(transaction.delete).toHaveBeenLastCalledWith({
                    path: 'users/user-1/collections/existing-id',
                });
        },
    );
});
