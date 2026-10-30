export const COLLECTION_NAME_MAX_LENGTH = 60;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 300;

export interface CollectionInput {
    name: string;
    description: string;
}

export interface Collection extends CollectionInput {
    id: string;
    itemsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface GamePreview {
    slug: string;
    title: string;
    image: string;
}

export interface CollectionItem extends GamePreview {
    addedAt: Date;
}
