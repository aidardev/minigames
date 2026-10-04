import { BaseComponent } from '@/components/base-component';
import { html } from '@/utils/html';
import './not-found.scss';

export class NotFoundPage extends BaseComponent<'main'> {
    constructor() {
        super('main', 'not-found-page');

        this.setHtml(html`
            <section class="section not-found">
                <div class="container not-found__inner">
                    <p class="not-found__code" aria-hidden="true">404</p>
                    <h1 class="not-found__title">Page not found</h1>
                    <p class="not-found__text">
                        The address <code>${location.pathname}</code> does not exist or has been
                        moved.
                    </p>
                    <a class="not-found__btn btn btn--large btn--primary" href="/" data-link>
                        Return to Home Page
                    </a>
                </div>
            </section>
        `);
    }
}
