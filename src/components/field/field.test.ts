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

function render(options: FieldOptions = base): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = renderField(options).value;
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

        const root = render({ ...base, type: 'password', passwordToggle: true });
        const toggle = root.querySelector('[data-password-toggle]');

        expect(toggle?.getAttribute('aria-pressed')).toBe('false');
        expect(root.querySelector('.field')?.classList).toContain('field--has-password-toggle');
    });

    it('renders fields without an icon or reserved icon spacing', () => {
        const root = render({ ...base, icon: undefined });

        expect(root.querySelector('.field__icon')).toBeNull();
        expect(root.querySelector('.field')?.classList).not.toContain('field--has-icon');
        expect(render().querySelector('.field')?.classList).toContain('field--has-icon');
    });

    it('applies input constraints and includes boolean attributes only when enabled', () => {
        const options: FieldOptions = {
            ...base,
            type: 'text',
            maxLength: 60,
            required: true,
            autofocus: true,
        };
        const input = render(options).querySelector('input');

        expect(input?.maxLength).toBe(60);
        expect(input?.required).toBe(true);
        expect(input?.autofocus).toBe(true);

        const optionalInput = render({
            ...options,
            required: false,
            autofocus: false,
        }).querySelector('input');
        expect(optionalInput?.hasAttribute('required')).toBe(false);
        expect(optionalInput?.hasAttribute('autofocus')).toBe(false);
        expect(render().querySelector('input')?.hasAttribute('maxlength')).toBe(false);
    });

    it('renders a textarea with the shared label and error contract', () => {
        const root = render({
            id: 'collection-description',
            name: 'description',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Describe your collection',
            rows: 6,
            maxLength: 300,
            optional: true,
        });
        const textarea = root.querySelector('textarea');
        const error = root.querySelector<HTMLElement>('[data-field-error="description"]');

        expect(root.querySelector('label')?.htmlFor).toBe(textarea?.id);
        expect(root.querySelector('.field__optional')?.textContent).toBe('(optional)');
        expect(textarea?.name).toBe('description');
        expect(textarea?.rows).toBe(6);
        expect(textarea?.maxLength).toBe(300);
        expect(textarea?.required).toBe(false);
        expect(textarea?.getAttribute('autocomplete')).toBe('off');
        expect(textarea?.classList).toContain('field__input--multiline');
        expect(textarea?.getAttribute('aria-describedby')).toBe(error?.id);
        expect(error?.hidden).toBe(true);
        expect(root.querySelector('input')).toBeNull();
        expect(root.querySelector('.field__icon')).toBeNull();
        expect(root.querySelector('[data-password-toggle]')).toBeNull();
    });

    it.each(['text', 'textarea'] as const)('escapes labels and %s attributes', (type) => {
        const label = '<img src=x onerror="alert(1)">';
        const placeholder = '" autofocus onfocus="alert(1)';
        const root = render({
            id: 'safe-field',
            name: 'safe',
            type,
            label,
            placeholder,
        });
        const control = root.querySelector('input, textarea');

        expect(root.querySelector('label')?.textContent?.trim()).toBe(label);
        expect(root.querySelector('img')).toBeNull();
        expect(control?.getAttribute('placeholder')).toBe(placeholder);
        expect(control?.hasAttribute('onfocus')).toBe(false);
        expect(control?.hasAttribute('autofocus')).toBe(false);
    });
});
