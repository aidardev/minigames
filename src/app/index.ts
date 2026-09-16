import { HomePage } from '../pages/home/home';
import { LibraryPage } from '../pages/library/library';
import { Router } from './router';

export function startApp(): void {
    const appRoot = document.createElement('div');
    appRoot.className = 'app';

    document.body.prepend(appRoot);

    new Router(appRoot, {
        '/': HomePage,
        '/library': LibraryPage,
    }).start();
}
