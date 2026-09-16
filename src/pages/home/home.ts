import { BaseComponent } from '../../components/base-component';

export class HomePage extends BaseComponent {
    public constructor() {
        super('main', 'home-page');

        this.element.innerHTML = `
            <h1>Home</h1>
            <a href="/library" data-link>Library</a>
        `;
    }
}
