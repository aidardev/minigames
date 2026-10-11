import { showSnackbar } from '@/components/snackbar/snackbar';
import { appSession } from '@/services/session/app-session';
import type { AppSession } from '@/services/session/session.types';
import { openAuth } from './navigation';

export function requireSession(message: string): AppSession | undefined {
    const session = appSession.getActiveSession();

    if (session) return session;

    showSnackbar(message, 'warning');
    openAuth('login');

    return undefined;
}
