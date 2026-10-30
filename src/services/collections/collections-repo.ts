import { database } from '@/services/firebase/firebase';
import type {
    Collection,
    CollectionInput,
    CollectionItem,
    GamePreview,
} from '@/types/collection.types';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
    type CollectionReference,
    type DocumentData,
    type DocumentReference,
    type Timestamp,
} from 'firebase/firestore';

const BATCH_SIZE = 500;

export class CollectionNotFoundError extends Error {
    constructor() {
        super('Collection not found.');
        this.name = 'CollectionNotFoundError';
    }
}

interface CollectionDocument {
    name: string;
    description: string;
    itemsCount: number;
    createdAt: Timestamp | undefined;
    updatedAt: Timestamp | undefined;
}

interface ItemDocument extends GamePreview {
    addedAt: Timestamp | undefined;
}

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

function toDate(timestamp: Timestamp | undefined): Date {
    return timestamp?.toDate() ?? new Date();
}

function toCollection(id: string, data: DocumentData): Collection {
    const { name, description, itemsCount, createdAt, updatedAt } = data as CollectionDocument;

    return {
        id,
        name,
        description,
        itemsCount,
        createdAt: toDate(createdAt),
        updatedAt: toDate(updatedAt),
    };
}

function toItem(data: DocumentData): CollectionItem {
    const { slug, title, image, addedAt } = data as ItemDocument;

    return { slug, title, image, addedAt: toDate(addedAt) };
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
): Promise<void> {
    await updateDoc(collectionReference(uid, collectionId), {
        ...normalize(input),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteCollection(uid: string, collectionId: string): Promise<void> {
    const items = itemsReference(uid, collectionId);

    let snapshot = await getDocs(query(items, limit(BATCH_SIZE)));

    while (!snapshot.empty) {
        const batch = writeBatch(database);
        for (const item of snapshot.docs) batch.delete(item.ref);
        await batch.commit();

        snapshot = await getDocs(query(items, limit(BATCH_SIZE)));
    }

    await deleteDoc(collectionReference(uid, collectionId));
}

export async function listItems(uid: string, collectionId: string): Promise<CollectionItem[]> {
    const snapshot = await getDocs(
        query(itemsReference(uid, collectionId), orderBy('addedAt', 'desc')),
    );

    return snapshot.docs.map((item) => toItem(item.data()));
}

export function addGame(uid: string, collectionId: string, preview: GamePreview): Promise<boolean> {
    return runTransaction(database, async (transaction): Promise<boolean> => {
        const parent = collectionReference(uid, collectionId);
        const parentSnapshot = await transaction.get(parent);
        if (!parentSnapshot.exists()) throw new CollectionNotFoundError();

        const reference = itemReference(uid, collectionId, preview.slug);
        const itemSnapshot = await transaction.get(reference);
        if (itemSnapshot.exists()) return false;

        const { itemsCount } = parentSnapshot.data() as CollectionDocument;

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

export function removeGames(
    uid: string,
    collectionId: string,
    slugs: readonly string[],
): Promise<void> {
    const uniqueSlugs = [...new Set(slugs)];
    if (uniqueSlugs.length === 0) return Promise.resolve();

    return runTransaction(database, async (transaction): Promise<void> => {
        const parent = collectionReference(uid, collectionId);
        const parentSnapshot = await transaction.get(parent);
        if (!parentSnapshot.exists()) throw new CollectionNotFoundError();

        const snapshots = await Promise.all(
            uniqueSlugs.map((slug) => transaction.get(itemReference(uid, collectionId, slug))),
        );
        const existing = snapshots.filter((snapshot) => snapshot.exists());
        if (existing.length === 0) return;

        const { itemsCount } = parentSnapshot.data() as CollectionDocument;

        for (const snapshot of existing) transaction.delete(snapshot.ref);
        transaction.update(parent, {
            itemsCount: Math.max(0, itemsCount - existing.length),
            updatedAt: serverTimestamp(),
        });
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
