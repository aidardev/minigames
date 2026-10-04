import { BaseComponent } from '@/components/base-component';
import { html } from '@/utils/html';
import './empty-state.scss';

export interface EmptyStateAction {
    label: string;
    onClick: () => void;
}

export interface EmptyStateProperties {
    title: string;
    description?: string;
    action?: EmptyStateAction;
}

export class EmptyState extends BaseComponent<'div'> {
    constructor({ title, description = '', action }: EmptyStateProperties) {
        super('div', 'empty-state');

        this.setHtml(html`
            <h3 class="empty-state__title">${title}</h3>
            ${description ? html`<p class="empty-state__description">${description}</p>` : ''}
            ${
                action
                    ? html`
                          <button
                              class="empty-state__btn btn btn--medium btn--primary"
                              type="button"
                          >
                              ${action.label}
                          </button>
                      `
                    : ''
            }
        `);

        if (action) {
            this.query('.empty-state__btn')?.addEventListener('click', action.onClick);
        }
    }
}
