import { navigate } from '@/app/navigation';
import type { QueryAware } from '@/app/router';
import { BaseComponent } from '@/components/base-component';
import { PageTitle } from '@/components/page-title/page-title';
import { CatalogSection } from './blocks/catalog/catalog';
import { parseLibraryQuery, type LibraryQuery } from './library-query';

export class LibraryPage extends BaseComponent implements QueryAware {
    private readonly catalog: CatalogSection;
    private isDestroyed = false;

    // The router passes the URL query, so a deep link renders the right state immediately.
    constructor(parameters: URLSearchParams) {
        super('main', 'library-page');

        const { query, hasInvalidValues } = parseLibraryQuery(parameters);

        this.catalog = this.adopt(new CatalogSection(query));

        this.element.append(
            new PageTitle({
                title: 'Game Library',
                subtitle: 'Browse our collection of casual mini-games',
            }).element,
            this.catalog.element,
        );

        if (hasInvalidValues) this.normalizeUrl(parameters, query);
    }

    // Invalid values (?page=abc) are replaced by the defaults the request actually used,
    // so the address bar always matches the data on screen.
    private normalizeUrl(parameters: URLSearchParams, query: LibraryQuery): void {
        const fixed = new URLSearchParams(parameters);
        fixed.set('category', query.category);
        fixed.set('sort', query.sort);
        fixed.set('page', String(query.page));

        // Deferred: while the page is being constructed the router has not finished mounting it.
        queueMicrotask((): void => {
            if (this.isDestroyed) return;
            navigate(`${location.pathname}?${fixed.toString()}`, { replace: true });
        });
    }

    /**
    Called by the router when only the query changed, so the page is not rebuilt.
    */
    public onQueryChange(parameters: URLSearchParams): void {
        const { query, hasInvalidValues } = parseLibraryQuery(parameters);

        this.catalog.update(query);

        if (hasInvalidValues) this.normalizeUrl(parameters, query);
    }

    public override destroy(): void {
        this.isDestroyed = true;
        super.destroy();
    }
}
