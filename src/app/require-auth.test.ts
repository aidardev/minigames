// @vitest-environment jsdom

import { showSnackbar } from '@/components/snackbar/snackbar';
import { appSession } from '@/services/session/app-session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openAuth } from './navigation';
import { requireSession } from './require-auth';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));
vi.mock('@/services/session/app-session', () => ({
    appSession: { getActiveSession: vi.fn() },
}));
vi.mock('./navigation', () => ({ openAuth: vi.fn() }));

const SESSION = { displayName: 'Alex', email: 'alex@minigames.com', authenticatedAt: 1 };

describe('requireSession', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns the session without side effects for an authenticated user', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(SESSION);

        expect(requireSession('Sign in.')).toBe(SESSION);
        expect(showSnackbar).not.toHaveBeenCalled();
        expect(openAuth).not.toHaveBeenCalled();
    });

    it('warns and opens Auth for a guest', () => {
        vi.mocked(appSession.getActiveSession).mockReturnValue(undefined);

        expect(requireSession('Sign in.')).toBeUndefined();
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith('Sign in.', 'warning');
        expect(openAuth).toHaveBeenCalledExactlyOnceWith('login');
    });
});
