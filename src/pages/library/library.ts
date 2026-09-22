import { getCategories } from '@/api/categories';
import { BaseComponent } from '@/components/base-component';
import { PageTitle } from '@/components/page-title/page-title';
import { CatalogSection } from './blocks/catalog/catalog';

export class LibraryPage extends BaseComponent {
    public constructor() {
        super('main', 'library-page');

        this.element.append(
            new PageTitle({
                title: 'Game Library',
                subtitle: 'Browse our collection of casual mini-games',
            }).element,
        );

        this.loadLibrary();
    }

    private async loadLibrary(): Promise<void> {
        const categories = await getCategories();
        this.element.append(new CatalogSection(categories).element);
    }
}
