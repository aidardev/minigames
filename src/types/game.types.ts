export interface Game {
    slug: string;
    name: string;
    category: string;
    price: string;
    shortDescription: string;
    rating: number;
    likesCount: number;
    cardImage: string;
    featured: boolean;
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

export interface GamesSeedResponse {
    data: Game[];
    meta: {
        totalItems: number;
        description: string;
        featuredCount: number;
    };
}
