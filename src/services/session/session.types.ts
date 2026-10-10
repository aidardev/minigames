export interface AppSessionProfile {
    displayName: string;
    email: string;
    avatarUrl?: string;
}

export interface AppSession extends AppSessionProfile {
    authenticatedAt: number;
}

export type SessionListener = (session: AppSession | undefined) => void;

export interface AppSessionHandlers {
    signOut: () => Promise<void>;
    onExpired: () => void;
}
