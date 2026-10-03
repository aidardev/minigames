import { BaseComponent } from '../components/base-component';

type PageConstructor = new () => BaseComponent;
type Routes = Record<string, PageConstructor>;
type RouteChangeListener = (path: string) => void;

export class Router {
    private static normalize(path: string): string {
        return path.replace(/\/+$/, '') || '/';
    }

    private readonly outlet: HTMLElement;
    private readonly routes: Routes;
    private readonly notFound: PageConstructor;
    private current: BaseComponent | undefined = undefined;
    private listeners: RouteChangeListener[] = [];

    constructor(outlet: HTMLElement, routes: Routes, notFound: PageConstructor) {
        this.outlet = outlet;
        this.routes = routes;
        this.notFound = notFound;
    }

    private render(): void {
        const path = Router.normalize(location.pathname);
        const Page = this.routes[path] ?? this.notFound;

        this.current?.destroy();
        this.current = new Page();
        this.outlet.append(this.current.element);

        for (const listener of this.listeners) {
            listener(path);
        }
    }

    public onRouteChange(listener: RouteChangeListener): void {
        this.listeners.push(listener);
    }

    public start(): void {
        addEventListener('popstate', (): void => this.render());

        document.addEventListener('click', (event): void => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const link = target.closest('a[data-link]');
            if (!link) return;

            event.preventDefault();
            this.navigate(link.getAttribute('href') ?? '/');
        });

        this.render();
    }

    public navigate(path: string): void {
        history.pushState(undefined, '', path);
        this.render();
        window.scrollTo(0, 0);
    }
}
