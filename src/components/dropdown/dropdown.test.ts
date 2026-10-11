// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown, type DropdownProperties } from './dropdown';

function query<T extends HTMLElement>(root: Element, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
}

describe('Dropdown', () => {
    const dropdowns: Dropdown[] = [];

    function setup(properties: Partial<DropdownProperties> = {}) {
        const onChange = vi.fn();
        const dropdown = new Dropdown({
            options: [
                { id: 'rating', label: 'Rating' },
                { id: 'name', label: 'Name' },
            ],
            activeId: 'rating',
            onChange,
            ...properties,
        });
        dropdowns.push(dropdown);
        document.body.append(dropdown.element);
        return {
            dropdown,
            element: dropdown.element,
            onChange,
            trigger: query<HTMLButtonElement>(dropdown.element, '.dropdown__btn'),
        };
    }

    afterEach(() => {
        for (const dropdown of dropdowns) dropdown.destroy();
        dropdowns.length = 0;
        vi.restoreAllMocks();
    });

    it('renders the initial value, options and collapsed state', () => {
        const { element, trigger } = setup();
        expect(trigger.textContent).toContain('Sort by: Rating');
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(element.classList.contains('dropdown--open')).toBe(false);
        expect(
            [...element.querySelectorAll('.dropdown__option')].map((option) =>
                option.textContent?.trim(),
            ),
        ).toEqual(['Rating', 'Name']);
        expect(query(element, '.dropdown__option--active').dataset.id).toBe('rating');
    });

    it('supports a custom label and modifier and an unknown initial value', () => {
        const { element, trigger } = setup({
            activeId: 'missing',
            label: 'Order',
            modifier: 'catalog__sort',
        });
        expect(trigger.textContent).toContain('Order:');
        expect(query(element, '.dropdown__value').textContent).toBe('');
        expect(element.querySelector('.dropdown__option--active')).toBeNull();
        expect(element.classList.contains('catalog__sort')).toBe(true);
    });

    it('toggles when the trigger is clicked', () => {
        const { element, trigger, onChange } = setup();
        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(element.classList.contains('dropdown--open')).toBe(true);
        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(element.classList.contains('dropdown--open')).toBe(false);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('selects an option from a nested element, updates the label and closes', () => {
        const { element, trigger, onChange } = setup();
        trigger.click();
        const option = query<HTMLButtonElement>(element, '[data-id="name"]');
        const label = document.createElement('span');
        label.textContent = 'Name';
        option.append(label);
        label.click();
        expect(query(element, '.dropdown__value').textContent).toBe('Name');
        expect(query(element, '.dropdown__option--active').dataset.id).toBe('name');
        expect(element.querySelectorAll('.dropdown__option--active')).toHaveLength(1);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(onChange).toHaveBeenCalledExactlyOnceWith('name');
    });

    it('stays open on an internal click and closes on an outside click', () => {
        const { element, trigger } = setup();
        trigger.click();
        query(element, '.dropdown__list').click();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        document.body.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes on Escape but leaves other keys alone', () => {
        const { trigger, onChange } = setup();
        trigger.click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('updates programmatically without notifying or closing and keeps an unchanged option intact', () => {
        const { dropdown, element, trigger, onChange } = setup();
        const initialOption = query(element, '[data-id="rating"]');
        dropdown.setActive('rating');
        expect(query(element, '[data-id="rating"]')).toBe(initialOption);
        trigger.click();
        dropdown.setActive('name');
        expect(query(element, '.dropdown__value').textContent).toBe('Name');
        expect(query(element, '.dropdown__option--active').dataset.id).toBe('name');
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('closes an option without an id without reporting a selection', () => {
        const { element, trigger, onChange } = setup();
        trigger.click();
        const option = query<HTMLButtonElement>(element, '[data-id="name"]');
        delete option.dataset.id;
        option.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(query(element, '.dropdown__value').textContent).toBe('Rating');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('allows selecting without a callback', () => {
        const { element } = setup({ onChange: undefined });
        query<HTMLButtonElement>(element, '[data-id="name"]').click();
        expect(query(element, '.dropdown__value').textContent).toBe('Name');
    });

    it('removes document listeners and its element on destroy', () => {
        const { dropdown, element, trigger } = setup();
        trigger.click();
        dropdown.destroy();
        document.body.click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(element.isConnected).toBe(false);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
});
