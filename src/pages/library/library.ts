import { BaseComponent } from '../../components/base-component';

export class LibraryPage extends BaseComponent {
    public constructor() {
        super('main', 'library-page');

        this.element.innerHTML = `
            <h1>Library</h1>
            <a href="/" data-link>Home</a>
        `;
    }
}
