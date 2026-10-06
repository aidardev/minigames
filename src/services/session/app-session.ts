import { showSnackbar } from '@/components/snackbar/snackbar';
import { signOutFirebaseUser } from '@/services/firebase/firebase';
import { AppSessionStore } from './app-session-store';

export const appSession = new AppSessionStore({
    signOut: signOutFirebaseUser,
    onExpired: (): void =>
        showSnackbar('Your session has expired. Please sign in again.', 'warning'),
});
