import { getDoc, getDocs, Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollection, listCollections, listItems } from './collections-repo';

vi.mock('@/services/firebase/firebase', () => ({ database: {} }));
vi.mock('firebase/firestore', async (importOriginal) => ({
    ...(await importOriginal<typeof import('firebase/firestore')>()),
    collection: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
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
