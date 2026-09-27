import { BaseComponent } from '../components/base-component';

type Routes = Record<string, new () => BaseComponent>;
type RouteChangeListener = (path: string) => void;

export class Router {
    private readonly outlet: HTMLElement;
    private readonly routes: Routes;
    private current: BaseComponent | undefined = undefined;
    private listeners: RouteChangeListener[] = [];

    constructor(outlet: HTMLElement, routes: Routes) {
        this.outlet = outlet;
        this.routes = routes;
    }

    private render(): void {
        const path = location.pathname;
        const Page = this.routes[path];

        this.current?.destroy();
        this.current = Page ? new Page() : undefined;

        if (this.current) {
            this.outlet.append(this.current.element);
        } else {
            this.outlet.textContent = '404';
        }

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
