// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderField, type FieldOptions } from './field';

const base: FieldOptions = {
    id: 'login-email',
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'e.g. alex@minigames.com',
    icon: '<svg></svg>',
    autocomplete: 'email',
};

function render(options: Partial<FieldOptions> = {}): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = renderField({ ...base, ...options }).value;
    return root;
}

describe('renderField', () => {
    it('renders a labelled input with the given attributes', () => {
        const root = render();
        const input = root.querySelector('input');

        expect(root.querySelector('label')?.getAttribute('for')).toBe('login-email');
        expect(input?.id).toBe('login-email');
        expect(input?.name).toBe('email');
        expect(input?.type).toBe('email');
        expect(input?.autocomplete).toBe('email');
    });

    it('renders a hidden error slot that the input points to', () => {
        const root = render();
        const error = root.querySelector<HTMLElement>('[data-field-error="email"]');

        expect(error?.id).toBe('login-email-error');
        expect(error?.hidden).toBe(true);
        expect(root.querySelector('input')?.getAttribute('aria-describedby')).toBe(error?.id);
    });

    it('renders the password toggle only when requested', () => {
        expect(render().querySelector('[data-password-toggle]')).toBeNull();

        const root = render({ type: 'password', passwordToggle: true });
        const toggle = root.querySelector('[data-password-toggle]');

        expect(toggle?.getAttribute('aria-pressed')).toBe('false');
        expect(root.querySelector('.field')?.classList).toContain('field--has-password-toggle');
    });
});
