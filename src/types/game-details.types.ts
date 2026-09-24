export interface GameSpecs {
    genre: string;
    players: string;
    duration: string;
    price: string;
}

export interface TopRecord {
    position: number;
    playerName: string;
    score: number;
    achievedAt: string;
}

export interface GameDetails {
    slug: string;
    name: string;
    heroImage: string;
    rating: number;
    likesCount: number;
    isLikedByCurrentUser: boolean;
    fullDescription: string;
    specs: GameSpecs;
    topRecords: TopRecord[];
}

export interface GameDetailsResponse {
    data: GameDetails;
}

export interface Comment {
    commentId: string;
    authorName: string;
    text: string;
    likesCount: number;
    isLikedByCurrentUser: boolean;
    createdAt: string;
}

export interface CommentsMeta {
    totalComments: number;
    returnedCount: number;
    sort: string;
}

export interface CommentsResponse {
    data: Comment[];
    meta: CommentsMeta;
}
