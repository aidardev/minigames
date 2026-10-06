import type {
    AppSession,
    AppSessionHandlers,
    AppSessionProfile,
    SessionListener,
} from './session.types';

export const APP_SESSION_STORAGE_KEY = 'minigames:aidardev:app-session';
export const APP_SESSION_LIFETIME_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Returns the session only if the stored text has exactly the shape we expect.
 */
function parseSession(raw: string): AppSession | undefined {
    let data: unknown;

    try {
        data = JSON.parse(raw);
    } catch {
        return;
    }

    if (!isRecord(data)) return;

    const { displayName, email, authenticatedAt, avatarUrl } = data;

    if (typeof displayName !== 'string' || typeof email !== 'string') return;
    if (typeof authenticatedAt !== 'number' || !Number.isFinite(authenticatedAt)) return;
    // A timestamp from the future would make the session live longer than 5 minutes.
    if (authenticatedAt > Date.now()) return;
    if (avatarUrl !== undefined && typeof avatarUrl !== 'string') return;

    return avatarUrl === undefined
        ? { displayName, email, authenticatedAt }
        : { displayName, email, authenticatedAt, avatarUrl };
}

function isExpired(session: AppSession): boolean {
    return Date.now() >= session.authenticatedAt + APP_SESSION_LIFETIME_MS;
}

export class AppSessionStore {
    private readonly handlers: AppSessionHandlers;
    private readonly listeners = new Set<SessionListener>();
    private session: AppSession | undefined;
    private timerId: ReturnType<typeof setTimeout> | undefined;

    constructor(handlers: AppSessionHandlers) {
        this.handlers = handlers;
    }

    private restore(): void {
        const raw = localStorage.getItem(APP_SESSION_STORAGE_KEY);

        if (raw === null) return;

        const stored = parseSession(raw);

        if (stored === undefined) {
            void this.end();
            return;
        }

        if (isExpired(stored)) {
            this.expire();
            return;
        }

        this.setSession(stored);
    }

    private expire(): void {
        void this.end();
        this.handlers.onExpired();
    }

    /**
     * The single way out of an authenticated state: logout, expiration, invalid data.
     */
    private async end(): Promise<void> {
        localStorage.removeItem(APP_SESSION_STORAGE_KEY);
        this.setSession(undefined);

        try {
            await this.handlers.signOut();
        } catch {
            // The app session is already cleared, so a failed Firebase sign-out must not break Guest Mode.
        }
    }

    private setSession(session: AppSession | undefined): void {
        this.session = session;
        clearTimeout(this.timerId);
        this.timerId = undefined;

        if (session) {
            const remaining = session.authenticatedAt + APP_SESSION_LIFETIME_MS - Date.now();

            this.timerId = setTimeout((): void => {
                this.expire();
            }, remaining);
        }

        for (const listener of this.listeners) listener(session);
    }

    /**
     * Calls the listener right away with the current state, then on every change.
     */
    public subscribe(listener: SessionListener): () => void {
        this.listeners.add(listener);
        listener(this.session);

        return (): void => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Use this before any protected action (favorite, comment, like):
     * it expires an outdated session first, so undefined always means "Guest Mode".
     */
    public getActiveSession(): AppSession | undefined {
        this.checkExpiration();

        return this.session;
    }

    public start(): void {
        this.restore();

        // A background tab can have its timer delayed, so re-check when the user comes back.
        document.addEventListener('visibilitychange', (): void => {
            if (document.visibilityState === 'visible') this.checkExpiration();
        });
        window.addEventListener('focus', (): void => {
            this.checkExpiration();
        });
    }

    public createSession(profile: AppSessionProfile): void {
        const session: AppSession = {
            displayName: profile.displayName,
            email: profile.email,
            authenticatedAt: Date.now(),
            ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
        };

        localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
        this.setSession(session);
    }

    public async logout(): Promise<void> {
        await this.end();
    }

    /**
     * Returns true if the session was expired by this call.
     */
    public checkExpiration(): boolean {
        if (this.session === undefined) return false;

        // localStorage can be edited in DevTools, so it is checked, not just memory.
        const raw = localStorage.getItem(APP_SESSION_STORAGE_KEY);
        const stored = raw === null ? undefined : parseSession(raw);

        // The key was deleted or corrupted: back to Guest Mode, no expiration notice.
        if (stored === undefined) {
            void this.end();
            return false;
        }

        if (isExpired(stored)) {
            this.expire();
            return true;
        }

        // The timestamp was edited to another valid value: follow the stored one.
        if (stored.authenticatedAt !== this.session.authenticatedAt) this.setSession(stored);

        return false;
    }
}
