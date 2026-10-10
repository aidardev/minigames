import closeIcon from '@/assets/icons/close.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { html, unsafeHtml } from '@/utils/html';
import './snackbar.scss';

export type SnackbarVariant = 'success' | 'error' | 'warning' | 'info';

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

interface SnackbarItemProperties {
    message: string;
    variant: SnackbarVariant;
    onClosed: () => void;
}

/**
One visible notification. Dismisses itself after AUTO_DISMISS_MS or on close click.
*/
class SnackbarItem extends BaseComponent<'div'> {
    private readonly onClosed: () => void;
    private readonly timerId: ReturnType<typeof setTimeout>;
    private isClosing = false;

    constructor({ message, variant, onClosed }: SnackbarItemProperties) {
        super('div', `snackbar snackbar--${variant}`);
        this.onClosed = onClosed;

        this.element.setAttribute('role', variant === 'error' ? 'alert' : 'status');

        this.setHtml(html`
            <p class="snackbar__message">${message}</p>
            <button class="snackbar__close" type="button" aria-label="Close notification">
                ${unsafeHtml(closeIcon)}
            </button>
        `);

        this.query('.snackbar__close')?.addEventListener('click', (): void => this.dismiss());

        this.timerId = setTimeout((): void => this.dismiss(), AUTO_DISMISS_MS);
    }

    private async leave(): Promise<void> {
        this.element.classList.add('snackbar--leaving');
        await Promise.allSettled(
            this.element.getAnimations().map((animation): Promise<unknown> => animation.finished),
        );
        this.destroy();
        this.onClosed();
    }

    public dismiss(): void {
        // Auto-dismiss and a manual click can race; the second call must do nothing.
        if (this.isClosing) return;
        this.isClosing = true;

        clearTimeout(this.timerId);
        this.leave();
    }
}

// Message + variant is the identity: several sections failing for the same reason show one notification.
const activeItems = new Map<string, SnackbarItem>();

function getContainer(): HTMLElement {
    let container = document.querySelector<HTMLElement>('.snackbar-container');

    if (!container) {
        container = document.createElement('div');
        container.className = 'snackbar-container';
        container.popover = 'manual';
        document.body.append(container);
    }

    if (!container.matches(':popover-open')) container.showPopover();

    return container;
}

export function bringSnackbarsToFront(): void {
    const container = document.querySelector<HTMLElement>('.snackbar-container');
    if (!container?.matches(':popover-open')) return;

    container.hidePopover();
    container.showPopover();
}

export function showSnackbar(message: string, variant: SnackbarVariant = 'info'): void {
    const key = `${variant}:${message}`;

    if (activeItems.has(key)) return;

    const item = new SnackbarItem({
        message,
        variant,
        onClosed: (): void => {
            activeItems.delete(key);
        },
    });

    activeItems.set(key, item);
    getContainer().append(item.element);

    if (activeItems.size > MAX_VISIBLE) {
        activeItems.values().next().value?.dismiss();
    }
}
