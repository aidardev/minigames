import { Footer } from '@/components/footer/footer';
import { Header } from '@/components/header/header';
import { HomePage } from '@/pages/home/home';
import { LibraryPage } from '@/pages/library/library';
import { NotFoundPage } from '@/pages/not-found/not-found';
import { DialogController } from './dialog-controller';
import { Router, type Route } from './router';

export function startApp(): void {
    const appRoot = document.createElement('div');
    appRoot.className = 'app';

    const header = new Header();
    const footer = new Footer();

    const pageOutlet = document.createElement('div');
    pageOutlet.className = 'app__outlet';

    appRoot.append(header.element, pageOutlet, footer.element);

    document.body.prepend(appRoot);

    const router = new Router(
        pageOutlet,
        {
            '/': HomePage,
            '/library': LibraryPage,
        },
        NotFoundPage,
    );

    new DialogController(router).start();

    router.onRouteChange(({ path }: Route): void => header.setActivePath(path));

    router.start();
}
