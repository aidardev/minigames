import closeIcon from '@/assets/icons/close-alt.svg?raw';
import deleteIcon from '@/assets/icons/delete.svg?raw';
import { renderField } from '@/components/field/field';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { CollectionNotFoundError } from '@/services/collections/collection-errors';
import {
    COLLECTION_DESCRIPTION_MAX_LENGTH,
    COLLECTION_NAME_MAX_LENGTH,
    type CollectionInput,
} from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import { FormValidator } from '@/utils/validation/form-validator';
import { DeleteCollectionDialog } from '../delete-collection-dialog/delete-collection-dialog';
import { Dialog } from '../dialog';
import './collection-dialog.scss';
import { CollectionGamesEditor, type LoadCollectionGames } from './collection-games-editor';
import { collectionSchema } from './collection-validation';

type SaveCollection = (
    values: Readonly<CollectionInput>,
    removedSlugs?: readonly string[],
) => Promise<string | undefined>;

export type CollectionDialogOptions =
    | { mode: 'create'; onSave: SaveCollection }
    | {
          mode: 'edit';
          initialValues: Readonly<CollectionInput>;
          onSave: SaveCollection;
          loadGames: LoadCollectionGames;
          onDelete: () => Promise<string | undefined>;
      };

const LABELS = {
    create: {
        title: 'New collection',
        subtitle: 'Give your games a place of their own.',
        submit: 'Create collection',
        pending: 'Creating…',
        success: 'Collection created.',
        error: 'Your collection could not be created. Please try again.',
    },
    edit: {
        title: 'Edit collection',
        subtitle: 'Update your collection and manage its games.',
        submit: 'Save changes',
        pending: 'Saving…',
        success: 'Collection updated.',
        error: 'Your collection could not be updated. Please try again.',
    },
} as const;

export class CollectionDialog extends Dialog {
    private static nextId = 0;
    private readonly onSave: SaveCollection;
    private readonly mode: CollectionDialogOptions['mode'];
    private readonly initialValues: Readonly<CollectionInput>;
    private readonly validator: FormValidator<CollectionInput>;
    private readonly form: HTMLFormElement;
    private readonly submitButton: HTMLButtonElement;
    private readonly onDelete: (() => Promise<string | undefined>) | undefined;
    private readonly gamesEditor: CollectionGamesEditor | undefined;
    private confirmation: DeleteCollectionDialog | undefined;
    private isPending = false;
    private isDisposed = false;

    private handleActionClick = (event: MouseEvent): void => {
        if (this.isPending || this.isDisposed || !(event.target instanceof Element)) return;
        if (event.target.closest('[data-action="close"]')) this.close();
        else if (event.target.closest('[data-action="ask-delete"]')) this.confirmDelete();
    };

    private handleFieldEvent = (event: Event): void => {
        if (this.isPending || this.isDisposed || this.confirmation) return;
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
        if (input.name !== 'name' && input.name !== 'description') return;

        this.validator.setValue(input.name, input.value);
        this.renderValidation();
    };

    private handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault();
        if (this.isPending || this.isDisposed || this.confirmation) return;

        // Read again for autofill and submissions that did not fire input events.
        for (const field of this.validator.fields) {
            this.validator.setValue(field, this.fieldInput(field).value);
        }
        this.renderValidation();
        if (!this.validator.isValid() || !this.hasChanges()) return;

        const { name, description } = this.validator.getValues();
        void this.save({ name: name.trim(), description: description.trim() });
    };

    constructor(options: CollectionDialogOptions) {
        const labels = LABELS[options.mode];
        super({ label: labels.title, modifier: 'dialog--collection' });
        this.mode = options.mode;
        this.onSave = options.onSave;
        this.onDelete = options.mode === 'edit' ? options.onDelete : undefined;
        this.initialValues =
            options.mode === 'edit'
                ? {
                      name: options.initialValues.name,
                      description: options.initialValues.description,
                  }
                : { name: '', description: '' };
        this.validator = new FormValidator<CollectionInput>(collectionSchema, this.initialValues);
        const fieldPrefix = `collection-form-${++CollectionDialog.nextId}`;

        this.setContent(html`
            <form class="collection-form" novalidate>
                <header class="collection-form__header">
                    <div>
                        <h2 class="collection-form__title">${labels.title}</h2>
                        <p class="collection-form__subtitle">${labels.subtitle}</p>
                    </div>
                    <button
                        class="collection-form__close dialog__close btn btn--icon"
                        type="button"
                        data-action="close"
                        aria-label="Close collection dialog"
                    >
                        ${unsafeHtml(closeIcon)}
                    </button>
                </header>

                <div class="collection-form__fields">
                    ${renderField({
                        id: `${fieldPrefix}-name`,
                        name: 'name',
                        label: 'Name',
                        type: 'text',
                        placeholder: 'e.g. Cozy evenings',
                        maxLength: COLLECTION_NAME_MAX_LENGTH,
                        required: true,
                        autofocus: true,
                    })}
                    ${renderField({
                        id: `${fieldPrefix}-description`,
                        name: 'description',
                        label: 'Description',
                        type: 'textarea',
                        placeholder: 'What brings these games together?',
                        maxLength: COLLECTION_DESCRIPTION_MAX_LENGTH,
                        optional: true,
                    })}
                </div>

                ${options.mode === 'edit' ? html`<div data-games-editor></div>` : ''}
                ${
                    options.mode === 'edit'
                        ? html` <section class="collection-form__danger">
                              <h3 class="collection-form__danger-title">Delete collection</h3>
                              <p class="collection-form__danger-description">
                                  Permanently delete this collection and its saved game list.
                              </p>
                              <button
                                  class="collection-form__delete btn btn--small btn--danger-text"
                                  type="button"
                                  data-action="ask-delete"
                              >
                                  <span aria-hidden="true">${unsafeHtml(deleteIcon)}</span>
                                  Delete collection
                              </button>
                          </section>`
                        : ''
                }
                <footer class="collection-form__actions">
                    <button
                        class="btn btn--medium btn--outline-on-primary"
                        type="button"
                        data-action="close"
                    >
                        Cancel
                    </button>
                    <button class="btn btn--medium btn--primary" type="submit">
                        ${labels.submit}
                    </button>
                </footer>
            </form>
        `);

        this.form = this.getElement<HTMLFormElement>('form');
        this.submitButton = this.getElement<HTMLButtonElement>('button[type="submit"]');
        if (options.mode === 'edit') {
            this.gamesEditor = this.adopt(
                new CollectionGamesEditor({
                    loadGames: options.loadGames,
                    onChange: (): void => this.renderValidation(),
                }),
            );
            this.getElement('[data-games-editor]').replaceWith(this.gamesEditor.element);
        }
        for (const field of this.validator.fields) {
            this.fieldInput(field).value = this.initialValues[field];
        }
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
        this.submitButton.disabled =
            this.isPending ||
            this.confirmation !== undefined ||
            !this.validator.isValid() ||
            !this.hasChanges();
    }

    private hasChanges(): boolean {
        if (this.mode === 'create') return true;
        const values = this.validator.getValues();
        return (
            (this.gamesEditor?.getRemovedSlugs().length ?? 0) > 0 ||
            values.name.trim() !== this.initialValues.name.trim() ||
            values.description.trim() !== this.initialValues.description.trim()
        );
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
        this.gamesEditor?.setDisabled(isPending);
        const labels = LABELS[this.mode];
        this.submitButton.textContent = isPending ? labels.pending : labels.submit;
        this.renderValidation();
    }

    private async save(values: Readonly<CollectionInput>): Promise<void> {
        this.setPending(true);
        try {
            const id =
                this.mode === 'edit'
                    ? await this.onSave(values, this.gamesEditor?.getRemovedSlugs() ?? [])
                    : await this.onSave(values);
            if (id === undefined || this.isDisposed) return;

            showSnackbar(LABELS[this.mode].success, 'success');
            this.close();
        } catch (error) {
            if (!this.isDisposed) {
                const message =
                    error instanceof CollectionNotFoundError
                        ? 'This collection was not found or is no longer available.'
                        : LABELS[this.mode].error;
                showSnackbar(message, 'error');
            }
        } finally {
            if (!this.isDisposed) this.setPending(false);
        }
    }

    private confirmDelete(): void {
        if (!this.onDelete || this.confirmation) return;
        const confirmation = new DeleteCollectionDialog({
            name: this.initialValues.name,
            onDelete: this.onDelete,
        });
        this.confirmation = confirmation;
        this.form.inert = true;
        this.setLocked(true);
        this.gamesEditor?.setDisabled(true);
        this.renderValidation();
        confirmation.element.addEventListener('close', (): void => {
            if (this.isDisposed || this.confirmation !== confirmation) return;
            this.confirmation = undefined;
            this.form.inert = false;
            this.setLocked(false);
            this.gamesEditor?.setDisabled(false);
            this.renderValidation();
            if (confirmation.element.returnValue === 'deleted') {
                this.close('deleted');
            } else {
                if (confirmation.element.returnValue === 'partial') void this.gamesEditor?.reload();
                this.getElement('[data-action="ask-delete"]').focus();
            }
        });
        confirmation.open();
    }

    private closeConfirmation(): void {
        const confirmation = this.confirmation;
        this.confirmation = undefined;
        confirmation?.close();
    }

    public override close(returnValue?: string): void {
        this.isDisposed = true;
        this.closeConfirmation();
        super.close(returnValue);
    }

    public override destroy(): void {
        this.isDisposed = true;
        this.closeConfirmation();
        super.destroy();
    }
}
