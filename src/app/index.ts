import { Footer } from '@/components/footer/footer';
import { Header } from '@/components/header/header';
import { CollectionPage } from '@/pages/collection/collection';
import { HomePage } from '@/pages/home/home';
import { LibraryPage } from '@/pages/library/library';
import { NotFoundPage } from '@/pages/not-found/not-found';
import { ProfilePage } from '@/pages/profile/profile';
import { collectionsStore } from '@/services/collections/collections-store';
import { appSession } from '@/services/session/app-session';
import { DialogController } from './dialog-controller';
import { Router, type Route } from './router';

export function startApp(): void {
    const appRoot = document.createElement('div');
    appRoot.className = 'app';

    const header = new Header({ session: appSession });
    const footer = new Footer();

    const pageOutlet = document.createElement('div');
    pageOutlet.className = 'app__outlet';

    appRoot.append(header.element, pageOutlet, footer.element);

    document.body.prepend(appRoot);

    appSession.subscribe((session): void => {
        collectionsStore.setUser(session?.uid);
    });
    appSession.start();

    const router = new Router(
        pageOutlet,
        {
            '/': HomePage,
            '/library': LibraryPage,
            '/profile': ProfilePage,
            '/profile/collections/:id': CollectionPage,
        },
        NotFoundPage,
        (): void => {
            appSession.checkExpiration();
        },
    );

    new DialogController(router).start();

    router.onRouteChange(({ path }: Route): void => header.setActivePath(path));

    router.start();
}
