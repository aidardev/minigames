import { BaseComponent } from '../base-component';
import './dialog.scss';

interface DialogOptions {
    modifier?: string;
    label?: string;
}

export abstract class Dialog extends BaseComponent<'dialog'> {
    private readonly content: HTMLElement;
    private pointerDownOnBackdrop = false;

    private handlePointerDown = (event: PointerEvent): void => {
        this.pointerDownOnBackdrop = event.target === this.element;
    };

    private handleClick = (event: MouseEvent): void => {
        if (this.pointerDownOnBackdrop && event.target === this.element) {
            this.close();
        }
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
        this.element.addEventListener('close', this.handleClose);
    }

    protected setContent(content: string | Node): void {
        if (typeof content === 'string') {
            this.content.innerHTML = content;
        } else {
            this.content.replaceChildren(content);
        }
    }

    public open(): void {
        if (this.element.open) return;
        if (!this.element.isConnected) document.body.append(this.element);
        this.element.showModal();
    }

    public close(returnValue?: string): void {
        this.element.close(returnValue);
    }
}
