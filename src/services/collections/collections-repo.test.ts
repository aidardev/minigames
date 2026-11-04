import { FirebaseError } from 'firebase/app';
import {
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionNotFoundError } from './collection-errors';
import {
    createCollection,
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
});
