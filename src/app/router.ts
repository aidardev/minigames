import { BaseComponent } from '../components/base-component';

type Routes = Record<string, new () => BaseComponent>;

export class Router {
    private readonly outlet: HTMLElement;
    private readonly routes: Routes;
    private current: BaseComponent | undefined = undefined;

    constructor(outlet: HTMLElement, routes: Routes) {
        this.outlet = outlet;
        this.routes = routes;
    }

    private render(): void {
        const Page = this.routes[location.pathname];

        this.current?.destroy();
        this.current = Page ? new Page() : undefined;

        if (this.current) {
            this.outlet.append(this.current.element);
        } else {
            this.outlet.textContent = '404';
        }
    }

    public start(): void {
        addEventListener('popstate', () => this.render());

        document.addEventListener('click', (event) => {
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
    }
}
