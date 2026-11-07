import closeIcon from '@/assets/icons/close-alt.svg?raw';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { CollectionDeletionError } from '@/services/collections/collection-errors';
import { html, unsafeHtml } from '@/utils/html';
import { Dialog } from '../dialog';
import './delete-collection-dialog.scss';

interface DeleteCollectionDialogOptions {
    name: string;
    onDelete: () => Promise<string | undefined>;
}

export class DeleteCollectionDialog extends Dialog {
    private readonly onDelete: DeleteCollectionDialogOptions['onDelete'];
    private readonly deleteButton: HTMLButtonElement;
    private isPending = false;
    private isDisposed = false;

    private readonly handleActionClick = (event: MouseEvent): void => {
        if (this.isPending || this.isDisposed || !(event.target instanceof Element)) return;
        if (event.target.closest('[data-action="close"]')) this.close();
        else if (event.target.closest('[data-action="delete"]')) void this.deleteCollection();
    };

    constructor({ name, onDelete }: DeleteCollectionDialogOptions) {
        super({ label: 'Delete collection', modifier: 'dialog--collection' });
        this.onDelete = onDelete;
        this.setContent(html`
            <div class="delete-collection">
                <header class="delete-collection__header">
                    <h2 class="delete-collection__title">Delete collection?</h2>
                    <button
                        class="delete-collection__close dialog__close btn btn--icon"
                        type="button"
                        data-action="close"
                        aria-label="Close deletion confirmation"
                    >
                        ${unsafeHtml(closeIcon)}
                    </button>
                </header>
                <p class="delete-collection__description">
                    Delete “${name}” and all its saved games? This cannot be undone.
                </p>
                <footer class="delete-collection__actions">
                    <button
                        class="btn btn--medium btn--white"
                        type="button"
                        data-action="close"
                        autofocus
                    >
                        Keep collection
                    </button>
                    <button class="btn btn--medium btn--danger" type="button" data-action="delete">
                        Delete collection
                    </button>
                </footer>
            </div>
        `);
        this.deleteButton = this.getElement<HTMLButtonElement>('[data-action="delete"]');
        this.element.addEventListener('click', this.handleActionClick);
    }

    private setPending(isPending: boolean): void {
        this.isPending = isPending;
        this.setLocked(isPending);
        this.element.setAttribute('aria-busy', String(isPending));
        for (const button of this.element.querySelectorAll('button')) button.disabled = isPending;
        this.deleteButton.textContent = isPending ? 'Deleting…' : 'Delete collection';
    }

    private async deleteCollection(): Promise<void> {
        this.setPending(true);
        try {
            const id = await this.onDelete();
            if (id === undefined || this.isDisposed) return;
            showSnackbar('Collection deleted.', 'success');
            this.close('deleted');
        } catch (error) {
            if (this.isDisposed) return;
            const isPartialDeletion = error instanceof CollectionDeletionError;
            if (isPartialDeletion) this.element.returnValue = 'partial';
            showSnackbar(
                isPartialDeletion
                    ? error.message
                    : 'Your collection could not be deleted. Please try again.',
                'error',
            );
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
