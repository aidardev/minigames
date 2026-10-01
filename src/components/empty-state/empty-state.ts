import { BaseComponent } from '@/components/base-component';
import { html } from '@/utils/html';
import './empty-state.scss';

export interface EmptyStateProperties {
    title: string;
    description?: string;
}

export class EmptyState extends BaseComponent<'div'> {
    constructor({ title, description = '' }: EmptyStateProperties) {
        super('div', 'empty-state');

        this.setHtml(html`
            <h3 class="empty-state__title">${title}</h3>
            ${description ? html`<p class="empty-state__description">${description}</p>` : ''}
        `);
    }
}
