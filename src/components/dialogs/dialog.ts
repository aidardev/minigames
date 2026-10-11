import { SafeHtml } from '@/utils/html';
import { BaseComponent } from '../base-component';
import { bringSnackbarsToFront } from '../snackbar/snackbar';
import './dialog.scss';

interface DialogOptions {
    modifier?: string;
    label?: string;
}

export abstract class Dialog extends BaseComponent<'dialog'> {
    private readonly content: HTMLElement;
    private pointerDownOnBackdrop = false;
    private locked = false;

    private handlePointerDown = (event: PointerEvent): void => {
        this.pointerDownOnBackdrop = event.target === this.element;
    };

    private handleClick = (event: MouseEvent): void => {
        if (!this.locked && this.pointerDownOnBackdrop && event.target === this.element) {
            this.close();
        }
    };

    // Escape makes the browser fire "cancel" and close the dialog natively.
    private handleCancel = (event: Event): void => {
        if (this.locked) event.preventDefault();
    };

    // Chrome can skip a second cancelable "cancel" without user interaction in between,
    // so Escape is also stopped at the keydown level.
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (this.locked && event.key === 'Escape') event.preventDefault();
    };

    private handleClose = async (): Promise<void> => {
        await Promise.allSettled(
            this.element
                .getAnimations({ subtree: true })
                .map((animation): Promise<unknown> => animation.finished),
        );
        if (!this.element.open) this.destroy();
    };

    constructor({ label, modifier }: DialogOptions = {}) {
        const className = modifier ? `dialog ${modifier}` : 'dialog';
        super('dialog', className);

        if (label) {
            this.element.setAttribute('aria-label', label);
        }

        this.content = document.createElement('div');
        this.content.classList.add('dialog__content');
        this.element.append(this.content);

        this.bindEvents();
    }

    private bindEvents(): void {
        this.element.addEventListener('pointerdown', this.handlePointerDown);
        this.element.addEventListener('click', this.handleClick);
        this.element.addEventListener('cancel', this.handleCancel);
        this.element.addEventListener('keydown', this.handleKeyDown);
        this.element.addEventListener('close', this.handleClose);
    }

    protected setContent(content: SafeHtml | Node): void {
        if (content instanceof SafeHtml) {
            this.content.innerHTML = content.value;
        } else {
            this.content.replaceChildren(content);
        }
    }

    /**
     * While locked the user cannot dismiss the dialog (Escape, backdrop click).
     * Programmatic close() still works, so the owner can close it when the work is done.
     */
    protected setLocked(isLocked: boolean): void {
        this.locked = isLocked;
    }

    public open(): void {
        if (this.element.open) return;
        if (!this.element.isConnected) document.body.append(this.element);
        this.element.showModal();
        bringSnackbarsToFront();
    }

    public close(returnValue?: string): void {
        this.element.close(returnValue);
    }
}
