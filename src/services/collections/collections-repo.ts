import { database } from '@/services/firebase/firebase';
import type {
    Collection,
    CollectionInput,
    CollectionItem,
    GamePreview,
} from '@/types/collection.types';
import { FirebaseError } from 'firebase/app';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getDocsFromServer,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    type CollectionReference,
    type DocumentData,
    type DocumentReference,
} from 'firebase/firestore';
import { CollectionDeletionError, CollectionNotFoundError } from './collection-errors';

const BATCH_SIZE = 500;

function collectionsReference(uid: string): CollectionReference {
    return collection(database, 'users', uid, 'collections');
}

function collectionReference(uid: string, collectionId: string): DocumentReference {
    return doc(database, 'users', uid, 'collections', collectionId);
}

function itemsReference(uid: string, collectionId: string): CollectionReference {
    return collection(database, 'users', uid, 'collections', collectionId, 'items');
}

function itemReference(uid: string, collectionId: string, slug: string): DocumentReference {
    return doc(database, 'users', uid, 'collections', collectionId, 'items', slug);
}

function toDate(timestamp: unknown): Date {
    if (!(timestamp instanceof Timestamp)) throw new Error('Invalid collection timestamp.');
    return timestamp.toDate();
}

function readItemsCount(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : undefined;
}

function requireItemsCount(value: unknown): number {
    const count = readItemsCount(value);
    if (count === undefined) throw new Error('Invalid collection item count.');
    return count;
}

function toCollection(id: string, data: DocumentData): Collection {
    const { name, description, itemsCount, createdAt, updatedAt } = data;
    if (typeof name !== 'string' || typeof description !== 'string' || name.trim() === '') {
        throw new Error('Invalid collection document.');
    }

    return {
        id,
        name,
        description,
        itemsCount: readItemsCount(itemsCount),
        createdAt: toDate(createdAt),
        updatedAt: toDate(updatedAt),
    };
}

function toItem(id: string, data: DocumentData): CollectionItem {
    const { slug, title, image, addedAt } = data;
    if (
        slug !== id ||
        typeof title !== 'string' ||
        typeof image !== 'string' ||
        title.trim() === ''
    ) {
        throw new Error('Invalid collection item document.');
    }

    return { slug: id, title, image, addedAt: toDate(addedAt) };
}

function normalize({ name, description }: CollectionInput): CollectionInput {
    return { name: name.trim(), description: description.trim() };
}

export async function listCollections(uid: string): Promise<Collection[]> {
    const snapshot = await getDocs(query(collectionsReference(uid), orderBy('createdAt', 'desc')));

    return snapshot.docs.map((item) => toCollection(item.id, item.data()));
}

export async function getCollection(
    uid: string,
    collectionId: string,
): Promise<Collection | undefined> {
    const snapshot = await getDoc(collectionReference(uid, collectionId));

    return snapshot.exists() ? toCollection(snapshot.id, snapshot.data()) : undefined;
}

export async function createCollection(uid: string, input: CollectionInput): Promise<string> {
    const reference = doc(collectionsReference(uid));

    await setDoc(reference, {
        ...normalize(input),
        itemsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return reference.id;
}

export async function updateCollection(
    uid: string,
    collectionId: string,
    input: CollectionInput,
    removedSlugs: readonly string[] = [],
): Promise<void> {
    const slugs = [...new Set(removedSlugs)];
    if (slugs.length > 0) {
        await runTransaction(database, async (transaction): Promise<void> => {
            const parent = collectionReference(uid, collectionId);
            const parentSnapshot = await transaction.get(parent);
            if (!parentSnapshot.exists()) throw new CollectionNotFoundError();
            const snapshots = await Promise.all(
                slugs.map((slug) => transaction.get(itemReference(uid, collectionId, slug))),
            );
            const existing = snapshots.filter((snapshot) => snapshot.exists());
            const itemsCount = requireItemsCount(parentSnapshot.data()?.itemsCount);
            for (const snapshot of existing) transaction.delete(snapshot.ref);
            transaction.update(parent, {
                ...normalize(input),
                itemsCount: Math.max(0, itemsCount - existing.length),
                updatedAt: serverTimestamp(),
            });
        });
        return;
    }
    try {
        await updateDoc(collectionReference(uid, collectionId), {
            ...normalize(input),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        if (error instanceof FirebaseError && error.code === 'not-found') {
            throw new CollectionNotFoundError();
        }
        throw error;
    }
}

export async function deleteCollection(uid: string, collectionId: string): Promise<void> {
    const items = itemsReference(uid, collectionId);
    const parent = collectionReference(uid, collectionId);
    let isDeleted = false;
    let hasDeletedGames = false;
    try {
        while (!isDeleted) {
            isDeleted = await runTransaction(database, async (transaction): Promise<boolean> => {
                // App writes also update the parent: concurrent additions make this transaction retry.
                const parentSnapshot = await transaction.get(parent);
                const snapshot = await getDocsFromServer(query(items, limit(BATCH_SIZE)));
                const hasMore = snapshot.size === BATCH_SIZE;
                const games = hasMore ? snapshot.docs.slice(0, BATCH_SIZE - 1) : snapshot.docs;
                for (const game of games) transaction.delete(game.ref);
                if (!hasMore) {
                    transaction.delete(parent);
                    return true;
                }
                const count = readItemsCount(parentSnapshot.data()?.itemsCount);
                if (count !== undefined && parentSnapshot.exists()) {
                    // Keep remaining collections consistent even if a later chunk fails.
                    transaction.update(parent, {
                        itemsCount: Math.max(0, count - games.length),
                        updatedAt: serverTimestamp(),
                    });
                }
                return false;
            });
            hasDeletedGames = !isDeleted;
        }
    } catch (error) {
        if (hasDeletedGames) throw new CollectionDeletionError(error);
        throw error;
    }
}

export async function listItems(uid: string, collectionId: string): Promise<CollectionItem[]> {
    const snapshot = await getDocs(
        query(itemsReference(uid, collectionId), orderBy('addedAt', 'desc')),
    );

    return snapshot.docs.map((item) => toItem(item.id, item.data()));
}

export function addGame(uid: string, collectionId: string, preview: GamePreview): Promise<boolean> {
    return runTransaction(database, async (transaction): Promise<boolean> => {
        const parent = collectionReference(uid, collectionId);
        const parentSnapshot = await transaction.get(parent);
        if (!parentSnapshot.exists()) throw new CollectionNotFoundError();

        const reference = itemReference(uid, collectionId, preview.slug);
        const itemSnapshot = await transaction.get(reference);
        if (itemSnapshot.exists()) return false;

        const itemsCount = requireItemsCount(parentSnapshot.data()?.itemsCount);

        transaction.set(reference, {
            slug: preview.slug,
            title: preview.title,
            image: preview.image,
            addedAt: serverTimestamp(),
        });
        transaction.update(parent, {
            itemsCount: itemsCount + 1,
            updatedAt: serverTimestamp(),
        });

        return true;
    });
}

export async function findCollectionIdsContaining(
    uid: string,
    collectionIds: readonly string[],
    slug: string,
): Promise<string[]> {
    const snapshots = await Promise.all(
        collectionIds.map((collectionId) => getDoc(itemReference(uid, collectionId, slug))),
    );

    return collectionIds.filter((_id, index) => snapshots[index]?.exists());
}
