// @vitest-environment jsdom
import type { SafeHtml } from '@/utils/html';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderField } from './field';
import { bindPasswordToggles, resetPasswordToggles } from './password-toggle';

function field(name: string, isPasswordToggle: boolean): SafeHtml {
    return renderField({
        id: name,
        name,
        label: name,
        type: 'password',
        placeholder: '',
        icon: '',
        autocomplete: 'off',
        passwordToggle: isPasswordToggle,
    });
}

describe('password toggle', () => {
    let root: HTMLElement;

    function input(name: string): HTMLInputElement {
        const element = root.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`);
        if (!element) throw new Error(`No input ${name}`);
        return element;
    }

    function toggle(name: string): HTMLButtonElement {
        const element = input(name)
            .closest('.field')
            ?.querySelector<HTMLButtonElement>('[data-password-toggle]');
        if (!element) throw new Error(`No toggle for ${name}`);
        return element;
    }

    beforeEach(() => {
        root = document.createElement('form');
        root.innerHTML =
            field('first', true).value + field('second', true).value + field('plain', false).value;
        bindPasswordToggles(root);
    });

    it('reveals the password on click and hides it on the next one', () => {
        toggle('first').click();
        expect(input('first').type).toBe('text');
        expect(toggle('first').getAttribute('aria-pressed')).toBe('true');

        toggle('first').click();
        expect(input('first').type).toBe('password');
        expect(toggle('first').getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles each field independently', () => {
        toggle('first').click();

        expect(input('first').type).toBe('text');
        expect(input('second').type).toBe('password');
    });

    it('works when the click lands on the icon inside the button', () => {
        toggle('first').querySelector<HTMLElement>('.field__toggle-icon')?.click();

        expect(input('first').type).toBe('text');
    });

    it('keeps the value and ignores clicks outside toggles', () => {
        input('first').value = 'secret';

        toggle('first').click();
        input('first').click();
        root.click();

        expect(input('first').value).toBe('secret');
        expect(input('first').type).toBe('text');
    });

    it('prevents the mousedown default so the input keeps focus', () => {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        toggle('first').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    it('does not interfere with mousedown elsewhere', () => {
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        input('plain').dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });

    it('resetPasswordToggles hides every revealed password again', () => {
        toggle('first').click();
        toggle('second').click();

        resetPasswordToggles(root);

        expect(input('first').type).toBe('password');
        expect(input('second').type).toBe('password');
        expect(toggle('first').getAttribute('aria-pressed')).toBe('false');
    });
});
