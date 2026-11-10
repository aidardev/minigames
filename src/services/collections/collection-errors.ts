export class CollectionNotFoundError extends Error {
    constructor() {
        super('Collection not found.');
        this.name = 'CollectionNotFoundError';
    }
}

export class CollectionDeletionError extends Error {
    constructor(cause: unknown) {
        super(
            'Deletion was interrupted. Some games may already have been removed. Please try again.',
            { cause },
        );
        this.name = 'CollectionDeletionError';
    }
}
