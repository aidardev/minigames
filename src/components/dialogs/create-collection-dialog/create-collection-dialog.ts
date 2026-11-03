import closeIcon from '@/assets/icons/close-alt.svg?raw';
import { renderField } from '@/components/field/field';
import { showSnackbar } from '@/components/snackbar/snackbar';
import {
    COLLECTION_DESCRIPTION_MAX_LENGTH,
    COLLECTION_NAME_MAX_LENGTH,
    type CollectionInput,
} from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { FormValidator } from '@/utils/validation/form-validator';
import { Dialog } from '../dialog';
import { collectionSchema } from './collection-validation';
import './create-collection-dialog.scss';

export interface CreateCollectionDialogOptions {
    onCreate: (values: Readonly<CollectionInput>) => Promise<string | undefined>;
}

export class CreateCollectionDialog extends Dialog {
    private readonly onCreate: CreateCollectionDialogOptions['onCreate'];
    private readonly validator = new FormValidator<CollectionInput>(collectionSchema);
    private readonly form: HTMLFormElement;
    private readonly submitButton: HTMLButtonElement;
    private isPending = false;
    private isDisposed = false;

    private handleActionClick = (event: MouseEvent): void => {
        if (this.isPending || this.isDisposed || !(event.target instanceof Element)) return;
        if (event.target.closest('[data-action="close"]')) this.close();
    };

    private handleFieldEvent = (event: Event): void => {
        if (this.isPending || this.isDisposed) return;
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
        if (input.name !== 'name' && input.name !== 'description') return;

        this.validator.setValue(input.name, input.value);
        this.renderValidation();
    };

    private handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault();
        if (this.isPending || this.isDisposed) return;

        // Read again for autofill and submissions that did not fire input events.
        for (const field of this.validator.fields) {
            this.validator.setValue(field, this.fieldInput(field).value);
        }
        this.renderValidation();
        if (!this.validator.isValid()) return;

        const { name, description } = this.validator.getValues();
        void this.create({ name: name.trim(), description: description.trim() });
    };

    constructor({ onCreate }: CreateCollectionDialogOptions) {
        super({ label: 'Create collection', modifier: 'dialog--create-collection' });
        this.onCreate = onCreate;

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

        this.form = this.getElement<HTMLFormElement>('form');
        this.submitButton = this.getElement<HTMLButtonElement>('button[type="submit"]');
        this.element.addEventListener('click', this.handleActionClick);
        this.form.addEventListener('submit', this.handleSubmit);
        for (const type of ['input', 'change', 'focusout']) {
            this.form.addEventListener(type, this.handleFieldEvent);
        }
        this.renderValidation();
    }

    private fieldInput(field: keyof CollectionInput): HTMLInputElement | HTMLTextAreaElement {
        return this.getElement<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`);
    }

    private renderValidation(): void {
        for (const field of this.validator.fields) {
            const input = this.fieldInput(field);
            const error = this.getElement(`[data-field-error="${field}"]`);
            const message = this.validator.getVisibleError(field);
            error.textContent = message ?? '';
            error.hidden = message === undefined;
            input.removeAttribute('aria-invalid');
            if (message !== undefined) input.setAttribute('aria-invalid', 'true');
        }
        this.submitButton.disabled = this.isPending || !this.validator.isValid();
    }

    private setPending(isPending: boolean): void {
        this.isPending = isPending;
        this.setLocked(isPending);
        this.form.setAttribute('aria-busy', String(isPending));
        for (const control of this.form.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement
        >('input, textarea, button')) {
            control.disabled = isPending;
        }
        this.submitButton.textContent = isPending ? 'Creating…' : 'Create collection';
        this.renderValidation();
    }

    private async create(values: Readonly<CollectionInput>): Promise<void> {
        this.setPending(true);
        try {
            const id = await this.onCreate(values);
            if (id === undefined || this.isDisposed) return;

            showSnackbar('Collection created.', 'success');
            this.close();
        } catch {
            if (!this.isDisposed) {
                showSnackbar('Your collection could not be created. Please try again.', 'error');
            }
        } finally {
            if (!this.isDisposed) this.setPending(false);
        }
    }

    public override close(returnValue?: string): void {
        this.isDisposed = true;
        super.close(returnValue);
    }

    public override destroy(): void {
        this.isDisposed = true;
        super.destroy();
    }
}
