// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { BaseComponent } from '../components/base-component';
import { NAVIGATE_EVENT } from './navigation';
import { Router, type QueryAware } from './router';

class HomePage extends BaseComponent<'div'> implements QueryAware {
    public readonly initialQuery: URLSearchParams;
    public readonly queryChanges: string[] = [];
    public destroyCount = 0;

    constructor(query: URLSearchParams) {
        super('div');
        this.initialQuery = new URLSearchParams(query);
        homePages.push(this);
    }

    public onQueryChange(query: URLSearchParams): void {
        this.queryChanges.push(query.toString());
    }

    public override destroy(): void {
        this.destroyCount += 1;
        super.destroy();
    }
}

class LibraryPage extends BaseComponent<'div'> {
    public readonly initialQuery: URLSearchParams;
    public destroyCount = 0;

    constructor(query: URLSearchParams) {
        super('div');
        this.initialQuery = new URLSearchParams(query);
        libraryPages.push(this);
    }

    public override destroy(): void {
        this.destroyCount += 1;
        super.destroy();
    }
}

class NotFoundPage extends BaseComponent<'div'> {
    constructor() {
        super('div');
        notFoundPages.push(this);
    }
}

const homePages: HomePage[] = [];
const libraryPages: LibraryPage[] = [];
const notFoundPages: NotFoundPage[] = [];
const outlet = document.createElement('main');
const routeListener = vi.fn();

describe('Router', () => {
    let router: Router;
    let windowListeners: MockInstance<typeof globalThis.addEventListener>;
    let documentListeners: MockInstance<typeof document.addEventListener>;

    beforeEach(() => {
        vi.spyOn(globalThis, 'scrollTo').mockImplementation((): void => undefined);
        homePages.length = 0;
        libraryPages.length = 0;
        notFoundPages.length = 0;
        outlet.replaceChildren();
        history.replaceState(undefined, '', '/');
        document.body.append(outlet);
        windowListeners = vi.spyOn(globalThis, 'addEventListener');
        documentListeners = vi.spyOn(document, 'addEventListener');
        router = new Router(outlet, { '/': HomePage, '/library': LibraryPage }, NotFoundPage);
        router.onRouteChange(routeListener);
        router.start();
        routeListener.mockClear();
        vi.mocked(scrollTo).mockClear();
    });

    afterEach(() => {
        for (const [type, listener, options] of windowListeners.mock.calls) {
            removeEventListener(type, listener, options);
        }
        for (const [type, listener, options] of documentListeners.mock.calls) {
            document.removeEventListener(type, listener, options);
        }
        vi.restoreAllMocks();
        outlet.remove();
    });

    it('mounts the matching page with its initial query and notifies route listeners', () => {
        router.navigate('/library?category=puzzle');

        expect(libraryPages).toHaveLength(1);
        expect(libraryPages[0]?.initialQuery.get('category')).toBe('puzzle');
        expect(outlet.firstElementChild).toBe(libraryPages[0]?.element);
        expect(routeListener).toHaveBeenLastCalledWith({
            path: '/library',
            query: new URLSearchParams('category=puzzle'),
        });
    });

    it('updates a query-aware page without rebuilding it or scrolling', () => {
        router.navigate('/?game=first');
        const page = homePages.at(-1);
        const initialPageCount = homePages.length;

        router.navigate('/?game=second');

        expect(homePages).toHaveLength(initialPageCount);
        expect(page?.queryChanges).toEqual(['game=first', 'game=second']);
        expect(scrollTo).not.toHaveBeenCalled();
    });

    it('normalizes page aliases and paths with trailing slashes', () => {
        const initialHomePageCount = homePages.length;
        router.navigate('/library/');

        expect(libraryPages).toHaveLength(1);
        router.navigate('/home/');

        expect(homePages).toHaveLength(initialHomePageCount + 1);
        expect(libraryPages[0]?.destroyCount).toBe(1);
        expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    });

    it('mounts the not-found page for an unknown path', () => {
        router.navigate('/missing');

        expect(notFoundPages).toHaveLength(1);
        expect(outlet.firstElementChild).toBe(notFoundPages[0]?.element);
        expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    });

    it('does not add history for the current URL and supports replacing an entry', () => {
        const pushState = vi.spyOn(history, 'pushState');
        const replaceState = vi.spyOn(history, 'replaceState');

        router.navigate('/');
        expect(pushState).not.toHaveBeenCalled();

        router.navigate('/library?sort=recent', { replace: true });

        expect(replaceState).toHaveBeenCalledWith(history.state, '', '/library?sort=recent');
        expect(pushState).not.toHaveBeenCalled();
        expect(location.pathname + location.search).toBe('/library?sort=recent');
    });

    it('handles navigation events and popstate changes', () => {
        dispatchEvent(new Event(NAVIGATE_EVENT));
        expect(location.pathname).toBe('/');

        dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { to: '/library?source=event' } }));

        expect(location.pathname).toBe('/library');
        expect(libraryPages.at(-1)?.initialQuery.get('source')).toBe('event');

        history.pushState(undefined, '', '/?source=back');
        dispatchEvent(new PopStateEvent('popstate'));

        expect(homePages.at(-1)?.initialQuery.get('source')).toBe('back');
    });

    it('removes selected query parameters while preserving the rest of the URL', () => {
        router.navigate('/library?auth=login&game=cat#details');
        router.removeQuery('auth');

        expect(location.pathname + location.search + location.hash).toBe(
            '/library?game=cat#details',
        );

        router.removeQueryInPlace('game');

        expect(location.pathname + location.search + location.hash).toBe('/library#details');
    });

    it('ignores removal requests when none of the requested parameters exist', () => {
        const pushState = vi.spyOn(history, 'pushState');
        const replaceState = vi.spyOn(history, 'replaceState');

        router.removeQuery('absent');
        router.removeQueryInPlace('absent');

        expect(pushState).not.toHaveBeenCalled();
        expect(replaceState).not.toHaveBeenCalled();
    });

    it('intercepts unmodified same-tab links', () => {
        const link = document.createElement('a');
        link.dataset.link = '';
        link.href = '/library?from=link';
        outlet.append(link);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

        link.dispatchEvent(click);

        expect(click.defaultPrevented).toBe(true);
        expect(location.pathname + location.search).toBe('/library?from=link');
    });

    it.each([
        ['middle click', { button: 1 }],
        ['meta-modified click', { button: 0, metaKey: true }],
        ['ctrl-modified click', { button: 0, ctrlKey: true }],
        ['shift-modified click', { button: 0, shiftKey: true }],
        ['alt-modified click', { button: 0, altKey: true }],
    ])('leaves a %s to the browser', (_description, options) => {
        const link = document.createElement('a');
        link.dataset.link = '';
        link.href = '/';
        outlet.append(link);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...options });

        link.dispatchEvent(click);

        expect(click.defaultPrevented).toBe(false);
        expect(location.pathname).toBe('/');
    });

    it('does not intercept clicks already handled by another listener', () => {
        const link = document.createElement('a');
        link.dataset.link = '';
        link.href = '/';
        outlet.append(link);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        click.preventDefault();

        link.dispatchEvent(click);

        expect(click.defaultPrevented).toBe(true);
        expect(location.pathname).toBe('/');
    });

    it('leaves external-target and non-router elements alone', () => {
        const newTabLink = document.createElement('a');
        newTabLink.dataset.link = '';
        newTabLink.target = '_blank';
        newTabLink.href = '/';
        outlet.append(newTabLink);

        const ordinaryLink = document.createElement('a');
        ordinaryLink.href = '/';
        outlet.append(ordinaryLink);

        const newTabClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        const ordinaryClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        newTabLink.dispatchEvent(newTabClick);
        ordinaryLink.dispatchEvent(ordinaryClick);

        expect(newTabClick.defaultPrevented).toBe(false);
        expect(ordinaryClick.defaultPrevented).toBe(false);
        expect(location.pathname).toBe('/');

        const nonElementClick = new MouseEvent('click', { bubbles: true, cancelable: true });
        document.dispatchEvent(nonElementClick);

        expect(nonElementClick.defaultPrevented).toBe(false);
    });
});
