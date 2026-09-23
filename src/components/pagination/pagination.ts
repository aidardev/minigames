import arrowLeft from '@/assets/icons/chevron-backward.svg?raw';
import arrowRight from '@/assets/icons/chevron-forward.svg?raw';
import { BaseComponent } from '@/components/base-component';
import './pagination.scss';

const MOBILE_BREAKPOINT = 576;
const DESKTOP_VISIBLE_PAGES = 4;
const MOBILE_VISIBLE_PAGES = 3;

export interface PaginationProperties {
    totalPages: number;
    currentPage?: number;
    onChange?: (page: number) => void;
}

export class Pagination extends BaseComponent {
    private readonly totalPages: number;
    private readonly onChange?: (page: number) => void;
    private readonly mediaQuery = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    private currentPage: number;

    private handleBreakpointChange = (): void => {
        this.buildStructure();
        this.updateState();
    };

    private handleClick = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest<HTMLButtonElement>('button');
        if (!button || button.disabled) {
            return;
        }

        const action = button.dataset.action;
        if (action === 'prev') {
            this.goTo(this.currentPage - 1);
            return;
        }
        if (action === 'next') {
            this.goTo(this.currentPage + 1);
            return;
        }

        const page = Number(button.dataset.page);
        if (Number.isSafeInteger(page)) {
            this.goTo(page);
        }
    };

    public constructor({ totalPages, currentPage = 1, onChange }: PaginationProperties) {
        super('nav', 'pagination');

        this.totalPages = Math.max(1, Math.floor(totalPages));
        this.currentPage = this.normalizePage(currentPage);
        this.onChange = onChange;

        this.element.setAttribute('aria-label', 'Pagination');

        this.buildStructure();
        this.updateState();

        this.element.addEventListener('click', this.handleClick);
        this.mediaQuery.addEventListener('change', this.handleBreakpointChange);
    }

    private buildStructure(): void {
        const visiblePagesCount = this.getVisiblePagesCount();

        const pageButtons = Array.from(
            { length: visiblePagesCount },
            () => /* HTML */ `<button type="button" class="pagination__page"></button>`,
        ).join('');

        this.element.innerHTML = /* HTML */ `
            <button
                type="button"
                class="pagination__arrow"
                data-action="prev"
                aria-label="Previous page"
            >
                ${arrowLeft}
            </button>

            <div class="pagination__pages">${pageButtons}</div>

            <button
                type="button"
                class="pagination__arrow"
                data-action="next"
                aria-label="Next page"
            >
                ${arrowRight}
            </button>
        `;
    }

    private updateState(): void {
        const pages = this.getVisiblePageNumbers();

        const previousArrow = this.element.querySelector<HTMLButtonElement>('[data-action="prev"]');
        const nextArrow = this.element.querySelector<HTMLButtonElement>('[data-action="next"]');

        if (previousArrow) {
            previousArrow.disabled = this.currentPage === 1;
        }

        if (nextArrow) {
            nextArrow.disabled = this.currentPage === this.totalPages;
        }

        const pageButtons = this.element.querySelectorAll<HTMLButtonElement>('.pagination__page');

        for (const [index, button] of pageButtons.entries()) {
            const page = pages[index];
            button.textContent = String(page);
            button.dataset.page = String(page);

            const isActive = page === this.currentPage;
            button.classList.toggle('pagination__page--active', isActive);
            button.toggleAttribute('aria-current', isActive);
        }
    }

    private getVisiblePagesCount(): number {
        const maxVisiblePages = this.mediaQuery.matches
            ? MOBILE_VISIBLE_PAGES
            : DESKTOP_VISIBLE_PAGES;

        return Math.min(maxVisiblePages, this.totalPages);
    }

    private getVisiblePageNumbers(): number[] {
        const visiblePagesCount = this.getVisiblePagesCount();
        const maxStart = this.totalPages - visiblePagesCount + 1;

        let start = this.currentPage - Math.floor(visiblePagesCount / 2);

        start = Math.max(1, Math.min(start, maxStart));

        return Array.from({ length: visiblePagesCount }, (_, index) => start + index);
    }

    private goTo(page: number): void {
        const normalizedPage = this.normalizePage(page);
        if (normalizedPage === this.currentPage) {
            return;
        }

        this.currentPage = normalizedPage;
        this.updateState();
        this.onChange?.(this.currentPage);
    }

    private normalizePage(page: number): number {
        return Math.min(Math.max(Math.floor(page), 1), this.totalPages);
    }

    public destroy(): void {
        this.element.removeEventListener('click', this.handleClick);
        this.mediaQuery.removeEventListener('change', this.handleBreakpointChange);

        super.destroy();
    }
}
