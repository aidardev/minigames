// @vitest-environment jsdom

import { getComments } from '@/api/comments';
import { getGameDetails } from '@/api/game-details';
import { appSession } from '@/services/session/app-session';
import type { AppSession, SessionListener } from '@/services/session/session.types';
import type { GameComments, GameDetails } from '@/types/game-details.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameDetailsDialog } from './game-details-dialog';

vi.mock('@/api/api-error', () => ({ isNotFoundError: vi.fn(() => false) }));
vi.mock('@/api/game-details', () => ({ getGameDetails: vi.fn() }));
vi.mock('@/api/comments', () => ({ getComments: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({
    appSession: { getActiveSession: vi.fn(), subscribe: vi.fn() },
}));
vi.mock('./game-details-content', () => ({
    GameDetailsContent: class {
        public element = document.createElement('div');
        public destroy = vi.fn();
    },
}));
vi.mock('./comments-section', () => ({
    CommentsSection: class {
        public element = document.createElement('div');
        public destroy = vi.fn();
    },
}));

const SLUG = 'cat-mail-co';
const GAME = { slug: SLUG } as GameDetails;
const COMMENTS: GameComments = { comments: [], total: 0 };
const ALEX: AppSession = {
    uid: 'user-1',
    displayName: 'Alex',
    email: 'alex@minigames.com',
    authenticatedAt: 1,
};
const SAM: AppSession = {
    uid: 'user-2',
    displayName: 'Sam',
    email: 'sam@minigames.com',
    authenticatedAt: 1,
};

interface TestContext {
    dialog: GameDetailsDialog;
    emit: (session: AppSession | undefined) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
}

const noopListener: SessionListener = (): void => undefined;
function setup(initial: AppSession | undefined): TestContext {
    let listener: SessionListener = noopListener;
    const unsubscribe = vi.fn();

    vi.mocked(appSession.getActiveSession).mockReturnValue(initial);
    vi.mocked(appSession.subscribe).mockImplementation((next: SessionListener) => {
        listener = next;
        next(initial);

        return unsubscribe;
    });

    const dialog = new GameDetailsDialog({ slug: SLUG });

    return { dialog, emit: (session): void => listener(session), unsubscribe };
}

describe('GameDetailsDialog session changes', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(getGameDetails).mockResolvedValue(GAME);
        vi.mocked(getComments).mockResolvedValue(COMMENTS);
    });

    it('loads user-specific data for the current session', () => {
        setup(ALEX);

        expect(getGameDetails).toHaveBeenCalledExactlyOnceWith(
            SLUG,
            expect.objectContaining({ userEmail: ALEX.email }),
        );
        expect(getComments).toHaveBeenCalledExactlyOnceWith(
            SLUG,
            expect.objectContaining({ userEmail: ALEX.email }),
        );
    });

    it('reloads both regions as a guest when the session ends', () => {
        const { emit } = setup(ALEX);

        emit(undefined);

        expect(getGameDetails).toHaveBeenCalledTimes(2);
        expect(getGameDetails).toHaveBeenLastCalledWith(
            SLUG,
            expect.objectContaining({ userEmail: undefined }),
        );
        expect(getComments).toHaveBeenCalledTimes(2);
        expect(getComments).toHaveBeenLastCalledWith(
            SLUG,
            expect.objectContaining({ userEmail: undefined }),
        );
    });

    it('reloads when another user takes over the session', () => {
        const { emit } = setup(ALEX);

        emit(SAM);

        expect(getGameDetails).toHaveBeenLastCalledWith(
            SLUG,
            expect.objectContaining({ userEmail: SAM.email }),
        );
    });

    it('does not reload when the same user is reported again', () => {
        const { emit } = setup(ALEX);

        emit({ ...ALEX, authenticatedAt: 2 });

        expect(getGameDetails).toHaveBeenCalledOnce();
        expect(getComments).toHaveBeenCalledOnce();
    });

    it('does not reload for a guest that stays a guest', () => {
        const { emit } = setup(undefined);

        emit(undefined);

        expect(getGameDetails).toHaveBeenCalledOnce();
    });

    it('stops observing the session when destroyed', () => {
        const { dialog, unsubscribe } = setup(ALEX);

        dialog.destroy();

        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
