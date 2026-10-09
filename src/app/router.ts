import type { BaseComponent } from '../components/base-component';
import { isNavigateEvent, NAVIGATE_EVENT } from './navigation';

export interface Route {
    path: string;
    query: URLSearchParams;
}

export interface NavigateOptions {
    // Replaces the current history entry instead of adding a new one.
    replace?: boolean;
}

// Pages implement this to react to query changes without being rebuilt.
export interface QueryAware {
    onQueryChange(query: URLSearchParams): void;
}

type PageConstructor = new (query: URLSearchParams) => BaseComponent;
type Routes = Record<string, PageConstructor>;
type RouteChangeListener = (route: Route) => void;

const PATH_ALIASES: Readonly<Record<string, string>> = { '/home': '/' };

function isQueryAware(page: BaseComponent): page is BaseComponent & QueryAware {
    return 'onQueryChange' in page && typeof page.onQueryChange === 'function';
}

export class Router {
    private static normalize(path: string): string {
        const trimmed = path.replace(/\/+$/, '') || '/';

        return PATH_ALIASES[trimmed] ?? trimmed;
    }

    private static readRoute(): Route {
        return {
            path: this.normalize(location.pathname),
            query: new URLSearchParams(location.search),
        };
    }

    private readonly outlet: HTMLElement;
    private readonly routes: Routes;
    private readonly notFound: PageConstructor;
    private current: BaseComponent | undefined = undefined;
    private currentPath: string | undefined = undefined;
    private listeners: RouteChangeListener[] = [];

    constructor(outlet: HTMLElement, routes: Routes, notFound: PageConstructor) {
        this.outlet = outlet;
        this.routes = routes;
        this.notFound = notFound;
    }

    private mount(route: Route): void {
        const Page = this.routes[route.path] ?? this.notFound;

        this.current?.destroy();
        // The page receives the initial query so a deep link can restore its state immediately.
        this.current = new Page(route.query);
        this.currentPath = route.path;
        this.outlet.append(this.current.element);
    }

    private render(): void {
        const route = Router.readRoute();

        if (this.current && route.path === this.currentPath) {
            // Same page, new query (a dialog opened, a filter changed): rebuilding would
            // refetch everything and reset the page, so the page is only notified.
            if (isQueryAware(this.current)) this.current.onQueryChange(route.query);
        } else {
            this.mount(route);
        }

        for (const listener of this.listeners) {
            listener(route);
        }
    }

    private withoutQuery(keys: string[]): string | undefined {
        const url = new URL(location.href);

        if (!keys.some((key: string): boolean => url.searchParams.has(key))) return undefined;

        for (const key of keys) url.searchParams.delete(key);

        return `${url.pathname}${url.search}${url.hash}`;
    }

    public onRouteChange(listener: RouteChangeListener): void {
        this.listeners.push(listener);
    }

    public start(): void {
        addEventListener(NAVIGATE_EVENT, (event: Event): void => {
            if (isNavigateEvent(event)) this.navigate(event.detail.to, event.detail.options);
        });

        addEventListener('popstate', (): void => this.render());

        document.addEventListener('click', (event: MouseEvent): void => {
            // Leave new-tab and modified clicks to the browser.
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            if (!(event.target instanceof Element)) return;

            const link = event.target.closest<HTMLAnchorElement>('a[data-link]');
            if (!link || link.target === '_blank') return;

            event.preventDefault();
            this.navigate(link.getAttribute('href') ?? '/');
        });

        this.render();
    }

    public navigate(to: string, { replace = false }: NavigateOptions = {}): void {
        const target = new URL(to, location.href);
        const url = `${target.pathname}${target.search}${target.hash}`;

        // Navigating to the address we are already on must not add a history entry.
        if (url === `${location.pathname}${location.search}${location.hash}`) return;

        const isPageChange = Router.normalize(target.pathname) !== this.currentPath;

        if (replace) {
            history.replaceState(history.state, '', url);
        } else {
            history.pushState(undefined, '', url);
        }

        this.render();

        // Query-only changes (pagination, filters) keep the scroll position.
        if (isPageChange) window.scrollTo(0, 0);
    }

    /**
     * Removes query params (e.g. a closed dialog) from the URL as a new history entry,
     * so open/close actions can be walked through with Back and Forward.
     */
    public removeQuery(...keys: string[]): void {
        const target = this.withoutQuery(keys);

        if (target) this.navigate(target);
    }

    /**
     * Same as removeQuery, but rewrites the current history entry (used to drop a
     * query param that must never stay in history, e.g. a blocked dialog).
     */
    public removeQueryInPlace(...keys: string[]): void {
        const target = this.withoutQuery(keys);

        if (target) this.navigate(target, { replace: true });
    }
}
