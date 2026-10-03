export interface Game {
    slug: string;
    name: string;
    category: string;
    price: string;
    shortDescription: string;
    rating: number;
    likesCount: number;
    cardImage: string;
}

export interface GamesMeta {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    appliedFilter: Record<string, string | boolean>;
}

export interface GamesResponse {
    data: Game[];
    meta: GamesMeta;
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
