import { waitForAuthUid } from '@/services/firebase/firebase';
import type { Collection, CollectionInput } from '@/types/collection.types';
import { createCollection, listCollections } from './collections-repo';

export interface CollectionsState {
    readonly uid: string | undefined;
    // undefined means no successful response yet; [] is a loaded, empty list.
    readonly collections: readonly Collection[] | undefined;
    readonly status: 'idle' | 'loading' | 'ready' | 'error';
    readonly error: Error | undefined;
}

type CollectionsListener = (state: CollectionsState) => void;

export class CollectionsStore {
    private readonly listeners = new Set<CollectionsListener>();
    private requestId = 0;
    private userVersion = 0;
    private state: CollectionsState = {
        uid: undefined,
        collections: undefined,
        status: 'idle',
        error: undefined,
    };

    private setState(state: CollectionsState): void {
        this.state = state;

        for (const listener of this.listeners) listener(state);
    }

    public getState(): CollectionsState {
        return this.state;
    }

    public subscribe(listener: CollectionsListener): () => void {
        this.listeners.add(listener);
        listener(this.state);

        return (): void => {
            this.listeners.delete(listener);
        };
    }

    public setUser(uid: string | undefined): void {
        if (this.state.uid === uid) return;

        // Invalidate pending requests even if the next account has the same uid later.
        this.requestId += 1;
        this.userVersion += 1;
        this.setState({ uid, collections: undefined, status: 'idle', error: undefined });

        if (uid !== undefined) void this.reload();
    }

    public async create(input: Readonly<CollectionInput>): Promise<string | undefined> {
        const { uid } = this.state;
        if (uid === undefined) throw new Error('Sign in to create a collection.');
        const userVersion = this.userVersion;

        let id: string;
        try {
            const authUid = await waitForAuthUid();
            if (userVersion !== this.userVersion) return;
            if (authUid !== uid) throw new Error('Please sign in again to create a collection.');

            id = await createCollection(uid, input);
        } catch (error) {
            if (userVersion !== this.userVersion) return;
            throw error;
        }

        if (userVersion !== this.userVersion) return;
        void this.reload();
        return id;
    }

    public async reload(): Promise<void> {
        const { uid } = this.state;
        if (uid === undefined) return;

        const requestId = ++this.requestId;
        this.setState({ ...this.state, status: 'loading', error: undefined });

        let collections: Collection[];

        try {
            const authUid = await waitForAuthUid();
            if (requestId !== this.requestId) return;

            if (authUid !== uid) {
                throw new Error('Please sign in again to load your collections.');
            }

            collections = await listCollections(uid);
        } catch (error) {
            if (requestId !== this.requestId) return;

            this.setState({
                ...this.state,
                status: 'error',
                error:
                    error instanceof Error
                        ? error
                        : new Error('Could not load collections.', { cause: error }),
            });
            return;
        }

        if (requestId !== this.requestId) return;

        this.setState({ uid, collections, status: 'ready', error: undefined });
    }
}

export const collectionsStore = new CollectionsStore();
