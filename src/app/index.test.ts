// @vitest-environment jsdom

import { HomePage } from '@/pages/home/home';
import { LibraryPage } from '@/pages/library/library';
import { NotFoundPage } from '@/pages/not-found/not-found';
import { appSession } from '@/services/session/app-session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startApp } from './index';

const mocks = vi.hoisted(() => ({
    headerSetActivePath: vi.fn(),
    headerConstructor: vi.fn(),
    headerElement: undefined as HTMLElement | undefined,
    footerElement: undefined as HTMLElement | undefined,
    routerConstructor: vi.fn(),
    routerStart: vi.fn(),
    routerListener: undefined as ((route: { path: string }) => void) | undefined,
    dialogControllerStart: vi.fn(),
    dialogControllerConstructor: vi.fn(),
    routerInstance: undefined as object | undefined,
}));

vi.mock('@/components/header/header', () => ({
    Header: class {
        public readonly element = document.createElement('header');
        public setActivePath = mocks.headerSetActivePath;

        constructor(options: unknown) {
            mocks.headerConstructor(options);
            mocks.headerElement = this.element;
        }
    },
}));

vi.mock('@/components/footer/footer', () => ({
    Footer: class {
        public readonly element = document.createElement('footer');

        constructor() {
            mocks.footerElement = this.element;
        }
    },
}));

vi.mock('@/pages/home/home', () => ({ HomePage: class {} }));
vi.mock('@/pages/library/library', () => ({ LibraryPage: class {} }));
vi.mock('@/pages/not-found/not-found', () => ({ NotFoundPage: class {} }));
vi.mock('@/services/session/app-session', () => ({ appSession: { start: vi.fn() } }));
vi.mock('./dialog-controller', () => ({
    DialogController: class {
        public start = mocks.dialogControllerStart;

        constructor(router: unknown) {
            mocks.dialogControllerConstructor(router);
        }
    },
}));
vi.mock('./router', () => ({
    Router: class {
        public start = mocks.routerStart;

        constructor(...arguments_: unknown[]) {
            mocks.routerInstance = this;
            mocks.routerConstructor(...arguments_);
        }

        public onRouteChange(listener: (route: { path: string }) => void): void {
            mocks.routerListener = listener;
        }
    },
}));

describe('startApp', () => {
    beforeEach(() => {
        document.body.replaceChildren();
        vi.clearAllMocks();
        mocks.routerListener = undefined;
    });

    it('mounts app chrome, starts session and routing, and syncs active navigation', () => {
        startApp();

        const app = document.body.firstElementChild;
        expect(app?.classList.contains('app')).toBe(true);
        expect(app?.children).toHaveLength(3);
        expect(app?.children[0]).toBe(mocks.headerElement);
        expect(app?.children[1]?.classList.contains('app__outlet')).toBe(true);
        expect(app?.children[2]).toBe(mocks.footerElement);
        expect(appSession.start).toHaveBeenCalledOnce();
        expect(mocks.routerStart).toHaveBeenCalledOnce();
        expect(mocks.dialogControllerStart).toHaveBeenCalledOnce();
        expect(mocks.headerConstructor).toHaveBeenCalledExactlyOnceWith({ session: appSession });
        expect(mocks.dialogControllerConstructor).toHaveBeenCalledExactlyOnceWith(
            mocks.routerInstance,
        );

        expect(mocks.routerConstructor).toHaveBeenCalledExactlyOnceWith(
            app?.children[1],
            { '/': HomePage, '/library': LibraryPage },
            NotFoundPage,
        );

        mocks.routerListener?.({ path: '/library' });

        expect(mocks.headerSetActivePath).toHaveBeenCalledWith('/library');
    });
});
