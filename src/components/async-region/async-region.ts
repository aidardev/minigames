import { getErrorMessage } from '@/api/api-error';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { showSnackbar } from '@/components/snackbar/snackbar';

type Renderable = HTMLElement | BaseComponent;

export interface AsyncRegionOptions<T> {
    load: (signal: AbortSignal) => Promise<T>;
    renderSkeleton: () => Renderable;
    renderSuccess: (data: T) => Renderable;
    renderEmpty?: () => Renderable;
    renderError?: (error: unknown, retry: () => void) => Renderable | undefined;
    isEmpty?: (data: T) => boolean;
}

function isEmptyByDefault(data: unknown): boolean {
    return Array.isArray(data) && data.length === 0;
}

/**
 * Owns one data-driven area of the page and moves it through
 * skeleton -> (success | empty | error), cancelling outdated requests along the way.
 * Only the content area is swapped, so static parts of the parent stay untouched.
 */
export class AsyncRegion<T> extends BaseComponent<'div'> {
    private readonly options: AsyncRegionOptions<T>;

    // Controller of the request currently in flight; replaced on every load().
    private controller: AbortController | undefined;
    // Component currently displayed, kept so its timers/listeners can be cleaned up on replacement.
    private content: BaseComponent | undefined;

    constructor(options: AsyncRegionOptions<T>, className = '') {
        super('div', `async-region ${className}`.trim());
        this.options = options;
    }

    private renderEmpty(): Renderable {
        return this.options.renderEmpty?.() ?? new EmptyState({ title: 'Nothing here yet' });
    }

    private showError(error: unknown): void {
        const retry = (): void => {
            this.load();
        };

        const custom = this.options.renderError?.(error, retry);

        if (custom) {
            this.settle(custom);
            return;
        }

        const message = getErrorMessage(error);
        this.settle(new ErrorBanner({ message, onRetry: retry }));
        showSnackbar(message, 'error');
    }

    private settle(content: Renderable): void {
        this.element.removeAttribute('aria-busy');
        this.show(content);
    }

    private show(content: Renderable): void {
        this.content?.destroy();
        this.content = undefined;
        this.element.replaceChildren();

        if (content instanceof BaseComponent) {
            this.content = content;
            this.element.append(content.element);
        } else {
            this.element.append(content);
        }
    }

    /**
    Safe to call repeatedly: a newer call cancels the previous one.
    */
    public async load(): Promise<void> {
        this.controller?.abort();
        const controller = new AbortController();
        this.controller = controller;
        const { signal } = controller;

        this.element.setAttribute('aria-busy', 'true');
        this.show(this.options.renderSkeleton());

        let data: T;

        try {
            data = await this.options.load(signal);
        } catch (error) {
            // Cancelled by a newer load() or by destroy(): not an error, and the UI already belongs to someone else.
            if (signal.aborted) return;
            this.showError(error);
            return;
        }

        // The response may have arrived just before abort() was called; discard it as stale.
        if (signal.aborted) return;

        const isEmpty = (this.options.isEmpty ?? isEmptyByDefault)(data);
        this.settle(isEmpty ? this.renderEmpty() : this.options.renderSuccess(data));
    }

    public override destroy(): void {
        this.controller?.abort();
        this.content?.destroy();
        super.destroy();
    }
}
