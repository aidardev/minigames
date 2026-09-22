import { BaseComponent } from '@/components/base-component';
import { CatalogSection } from './blocks/catalog/catalog';

export class LibraryPage extends BaseComponent {
    public constructor() {
        super('main', 'library-page');

        this.element.append(new CatalogSection().element);
    }
}
