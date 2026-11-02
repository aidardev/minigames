import closeIcon from '@/assets/icons/close-alt.svg?raw';
import { renderField } from '@/components/field/field';
import {
    COLLECTION_DESCRIPTION_MAX_LENGTH,
    COLLECTION_NAME_MAX_LENGTH,
} from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { Dialog } from '../dialog';
import './create-collection-dialog.scss';

export class CreateCollectionDialog extends Dialog {
    private handleActionClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest('[data-action="close"]')) this.close();
    };

    constructor() {
        super({ label: 'Create collection', modifier: 'dialog--create-collection' });

        this.setContent(html`
            <form class="create-collection" novalidate>
                <header class="create-collection__header">
                    <div>
                        <h2 class="create-collection__title">New collection</h2>
                        <p class="create-collection__subtitle">
                            Give your games a place of their own.
                        </p>
                    </div>
                    <button
                        class="create-collection__close dialog__close btn btn--icon"
                        type="button"
                        data-action="close"
                        aria-label="Close create collection"
                    >
                        ${unsafeHtml(closeIcon)}
                    </button>
                </header>

                <div class="create-collection__fields">
                    ${renderField({
                        id: 'create-collection-name',
                        name: 'name',
                        label: 'Name',
                        type: 'text',
                        placeholder: 'e.g. Cozy evenings',
                        maxLength: COLLECTION_NAME_MAX_LENGTH,
                        required: true,
                        autofocus: true,
                    })}
                    ${renderField({
                        id: 'create-collection-description',
                        name: 'description',
                        label: 'Description',
                        type: 'textarea',
                        placeholder: 'What brings these games together?',
                        maxLength: COLLECTION_DESCRIPTION_MAX_LENGTH,
                        optional: true,
                    })}
                </div>

                <footer class="create-collection__actions">
                    <button
                        class="btn btn--medium btn--outline-on-primary"
                        type="button"
                        data-action="close"
                    >
                        Cancel
                    </button>
                    <button class="btn btn--medium btn--primary" type="submit">
                        Create collection
                    </button>
                </footer>
            </form>
        `);

        this.element.addEventListener('click', this.handleActionClick);
        this.getElement<HTMLFormElement>('form').addEventListener('submit', (event): void => {
            event.preventDefault();
        });
    }
}
