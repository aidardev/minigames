import { waitForAuthUid } from '@/services/firebase/firebase';
import type { Collection } from '@/types/collection.types';
import { listCollections } from './collections-repo';

export interface CollectionsState {
    readonly collections: readonly Collection[];
    readonly status: 'idle' | 'loading' | 'ready' | 'error';
    readonly error: Error | undefined;
}

type CollectionsListener = (state: CollectionsState) => void;

export class CollectionsStore {
    private readonly listeners = new Set<CollectionsListener>();
    private uid: string | undefined;
    private requestId = 0;
    private state: CollectionsState = {
        collections: [],
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
        if (this.uid === uid) return;

        this.uid = uid;
        // Invalidate pending requests even if the next account has the same uid later.
        this.requestId += 1;
        this.setState({ collections: [], status: 'idle', error: undefined });

        if (uid !== undefined) void this.reload();
    }

    public async reload(): Promise<void> {
        const uid = this.uid;
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

        this.setState({ collections, status: 'ready', error: undefined });
    }
}

export const collectionsStore = new CollectionsStore();
