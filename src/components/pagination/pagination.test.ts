// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pagination, type PaginationProperties } from './pagination';

function button(root: Element, selector: string): HTMLButtonElement {
    const element = root.querySelector<HTMLButtonElement>(selector);
    if (!element) throw new Error(`Missing button: ${selector}`);
    return element;
}

function pages(root: Element): number[] {
    return [...root.querySelectorAll('.pagination__page')].map((page) => Number(page.textContent));
}

describe('Pagination', () => {
    const paginations: Pagination[] = [];
    let mediaQuery: EventTarget & { matches: boolean };

    beforeEach(() => {
        mediaQuery = Object.assign(new EventTarget(), { matches: false });
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => mediaQuery),
        );
    });

    afterEach(() => {
        for (const pagination of paginations) pagination.destroy();
        paginations.length = 0;
        vi.unstubAllGlobals();
    });

    function setup(properties: Partial<PaginationProperties> = {}) {
        const onChange = vi.fn();
        const pagination = new Pagination({ totalPages: 10, onChange, ...properties });
        paginations.push(pagination);
        document.body.append(pagination.element);
        return { pagination, element: pagination.element, onChange };
    }

    it('starts on page one with a disabled previous arrow', () => {
        const { element } = setup();
        expect(element.getAttribute('aria-label')).toBe('Pagination');
        expect(pages(element)).toEqual([1, 2, 3, 4]);
        expect(button(element, '[data-action="prev"]').disabled).toBe(true);
        expect(button(element, '[data-action="next"]').disabled).toBe(false);
        expect(button(element, '[data-page="1"]').getAttribute('aria-current')).toBe('page');
    });

    it.each([
        [1, [1, 2, 3, 4]],
        [5, [3, 4, 5, 6]],
        [10, [7, 8, 9, 10]],
    ])('shows the desktop window for page %s', (currentPage, expected) => {
        const { element } = setup({ currentPage });
        expect(pages(element)).toEqual(expected);
        expect(button(element, '.pagination__page--active').textContent).toBe(String(currentPage));
    });

    it.each([
        { totalPages: 0, currentPage: -2, expected: 1, visible: [1] },
        { totalPages: 3.9, currentPage: 9, expected: 3, visible: [1, 2, 3] },
        { totalPages: 10, currentPage: 2.9, expected: 2, visible: [1, 2, 3, 4] },
    ])('normalizes total/current pages: %j', ({ totalPages, currentPage, expected, visible }) => {
        const { element, onChange } = setup({ totalPages, currentPage });
        expect(pages(element)).toEqual(visible);
        expect(button(element, '.pagination__page--active').textContent).toBe(String(expected));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('updates state and notifies for next, previous and a nested page click', () => {
        const { element, onChange } = setup();
        button(element, '[data-action="next"]').click();
        expect(button(element, '.pagination__page--active').textContent).toBe('2');
        expect(button(element, '[data-action="prev"]').disabled).toBe(false);
        button(element, '[data-action="prev"]').click();
        const nested = document.createElement('span');
        button(element, '[data-page="4"]').append(nested);
        nested.click();
        expect(onChange.mock.calls).toEqual([[2], [1], [4]]);
        expect(button(element, '.pagination__page--active').getAttribute('aria-current')).toBe(
            'page',
        );
        expect(button(element, '.pagination__page--active').textContent).toBe('4');
        expect(element.querySelectorAll('.pagination__page--active')).toHaveLength(1);
    });

    it('ignores disabled arrows, unrelated clicks and invalid page data', () => {
        const { element, onChange } = setup({ totalPages: 1 });
        button(element, '[data-action="prev"]').dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
        button(element, '[data-action="next"]').click();
        element.dispatchEvent(new MouseEvent('click'));
        const page = button(element, '[data-page="1"]');
        page.dataset.page = 'invalid';
        page.click();
        expect(onChange).not.toHaveBeenCalled();
        expect(pages(element)).toEqual([1]);
        expect(button(element, '[data-action="next"]').disabled).toBe(true);
    });

    it('rebuilds the page window on breakpoint changes without changing the selected page', () => {
        const { element, onChange } = setup({ currentPage: 5 });
        mediaQuery.matches = true;
        mediaQuery.dispatchEvent(new Event('change'));
        expect(pages(element)).toEqual([4, 5, 6]);
        expect(button(element, '.pagination__page--active').textContent).toBe('5');
        mediaQuery.matches = false;
        mediaQuery.dispatchEvent(new Event('change'));
        expect(pages(element)).toEqual([3, 4, 5, 6]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('uses a mobile window from the first render and allows no callback', () => {
        mediaQuery.matches = true;
        const { element } = setup({ currentPage: 10, onChange: undefined });
        expect(pages(element)).toEqual([8, 9, 10]);
        expect(button(element, '[data-action="next"]').disabled).toBe(true);
        button(element, '[data-action="prev"]').click();
        expect(button(element, '.pagination__page--active').textContent).toBe('9');
    });

    it('removes click and breakpoint listeners on destroy', () => {
        const { pagination, element, onChange } = setup();
        pagination.destroy();
        button(element, '[data-action="next"]').click();
        mediaQuery.matches = true;
        mediaQuery.dispatchEvent(new Event('change'));
        expect(onChange).not.toHaveBeenCalled();
        expect(pages(element)).toEqual([1, 2, 3, 4]);
        expect(element.isConnected).toBe(false);
    });
});
