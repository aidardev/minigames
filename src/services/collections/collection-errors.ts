export class CollectionNotFoundError extends Error {
    constructor() {
        super('Collection not found.');
        this.name = 'CollectionNotFoundError';
    }
}
