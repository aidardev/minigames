import { BaseComponent } from '@/components/base-component';
import { html } from '@/utils/html';
import './error-banner.scss';

export interface ErrorBannerProperties {
    message: string;
    onRetry: () => void;
    title?: string;
}

export class ErrorBanner extends BaseComponent<'div'> {
    constructor({ message, onRetry, title = 'Something went wrong' }: ErrorBannerProperties) {
        super('div', 'error-banner');
        this.element.setAttribute('role', 'alert');

        this.setHtml(html`
            <h3 class="error-banner__title">${title}</h3>
            <p class="error-banner__message">${message}</p>
            <button class="error-banner__retry btn btn--medium btn--primary" type="button">
                Try again
            </button>
        `);

        this.query('.error-banner__retry')?.addEventListener('click', onRetry);
    }
}
