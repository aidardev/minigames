import { BaseComponent } from '../base-component';
import './page-title.scss';

export interface PageTitleProperties {
    title: string;
    subtitle?: string;
}

export class PageTitle extends BaseComponent {
    constructor({ title, subtitle }: PageTitleProperties) {
        super('div', 'page-title container');

        this.element.innerHTML = /* HTML */ `
            <h1 class="page-title__title">${title}</h1>
            ${subtitle ? `<p class="page-title__subtitle">${subtitle}</p>` : ''}
        `;
    }
}
