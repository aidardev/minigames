export interface GameSlideData {
    slug: string;
    name: string;
    rating: number;
    likesCount: number;
    cardImage: string;
}

export interface GameCategory {
    slug: string;
    label: string;
    isDefault: boolean;
}

export interface CategoriesResponse {
    data: GameCategory[];
    meta: {
        totalItems: number;
        description: string;
    };
}
