// @vitest-environment jsdom
import { html, type SafeHtml } from '@/utils/html';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form';
import { AuthErrorMessage as Message } from './auth-validation';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

function input(form: HTMLFormElement, name: string): HTMLInputElement {
    const element = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`);
    if (!element) throw new Error(`No input "${name}"`);
    return element;
}

function errorOf(form: HTMLFormElement, name: string): HTMLElement {
    const element = form.querySelector<HTMLElement>(`[data-field-error="${CSS.escape(name)}"]`);
    if (!element) throw new Error(`No error slot "${name}"`);
    return element;
}

function submitButton(form: HTMLFormElement): HTMLButtonElement {
    const element = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!element) throw new Error('No submit button');
    return element;
}

function type(form: HTMLFormElement, name: string, value: string): void {
    const element = input(form, name);
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
}

function blur(form: HTMLFormElement, name: string): void {
    input(form, name).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

function submit(form: HTMLFormElement): SubmitEvent {
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event;
}

describe('LoginForm', () => {
    let form: HTMLFormElement;
    const onSubmit = vi.fn();

    beforeEach(() => {
        onSubmit.mockClear();
        form = new LoginForm({ onSubmit }).element;
    });

    it('starts with a disabled submit button and no visible errors', () => {
        expect(submitButton(form).disabled).toBe(true);
        expect(errorOf(form, 'email').hidden).toBe(true);
        expect(errorOf(form, 'password').hidden).toBe(true);
    });

    it('turns off the native browser validation bubbles', () => {
        expect(form.noValidate).toBe(true);
    });

    it('validates while typing and marks the input as invalid', () => {
        type(form, 'email', 'not-an-email');

        expect(errorOf(form, 'email').hidden).toBe(false);
        expect(errorOf(form, 'email').textContent).toBe(Message.emailInvalid);
        expect(input(form, 'email').getAttribute('aria-invalid')).toBe('true');
    });

    it('clears the error as soon as the value becomes valid', () => {
        type(form, 'email', 'not-an-email');
        type(form, 'email', 'alex@minigames.com');

        expect(errorOf(form, 'email').hidden).toBe(true);
        expect(errorOf(form, 'email').textContent).toBe('');
        expect(input(form, 'email').hasAttribute('aria-invalid')).toBe(false);
    });

    it('shows the required error when an empty field is left', () => {
        blur(form, 'password');

        expect(errorOf(form, 'password').textContent).toBe(Message.passwordRequired);
        expect(errorOf(form, 'email').hidden).toBe(true);
    });

    it('reacts to the change event too (e.g. autofill)', () => {
        const email = input(form, 'email');
        email.value = 'bad';
        email.dispatchEvent(new Event('change', { bubbles: true }));

        expect(errorOf(form, 'email').textContent).toBe(Message.emailInvalid);
    });

    it('enables submit only when both fields are valid', () => {
        type(form, 'email', 'alex@minigames.com');
        expect(submitButton(form).disabled).toBe(true);

        type(form, 'password', '12345');
        expect(submitButton(form).disabled).toBe(true);

        type(form, 'password', '123456');
        expect(submitButton(form).disabled).toBe(false);

        type(form, 'email', 'broken');
        expect(submitButton(form).disabled).toBe(true);
    });

    it('does not submit an invalid form, but reveals all errors and cancels the event', () => {
        const event = submit(form);

        expect(event.defaultPrevented).toBe(true);
        expect(onSubmit).not.toHaveBeenCalled();
        expect(errorOf(form, 'email').textContent).toBe(Message.emailRequired);
        expect(errorOf(form, 'password').textContent).toBe(Message.passwordRequired);
    });

    it('passes the values to onSubmit when the form is valid', () => {
        type(form, 'email', 'alex@minigames.com');
        type(form, 'password', 'secret');

        const event = submit(form);

        expect(event.defaultPrevented).toBe(true);
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({
            email: 'alex@minigames.com',
            password: 'secret',
        });
    });

    it('works without an onSubmit callback', () => {
        const bare = new LoginForm().element;
        type(bare, 'email', 'alex@minigames.com');
        type(bare, 'password', 'secret');

        expect(() => submit(bare)).not.toThrow();
    });

    it('ignores events from elements that are not fields', () => {
        const button = form.querySelector<HTMLButtonElement>('button[type="button"]');

        expect(() =>
            button?.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
        ).not.toThrow();
        expect(errorOf(form, 'email').hidden).toBe(true);
    });

    it('has a working password visibility toggle that does not count as leaving the field', () => {
        const toggle = form.querySelector<HTMLButtonElement>('[data-password-toggle]');
        const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        toggle?.dispatchEvent(mousedown);
        toggle?.click();

        expect(mousedown.defaultPrevented).toBe(true);
        expect(input(form, 'password').type).toBe('text');
        expect(errorOf(form, 'password').hidden).toBe(true);
    });

    it('reset hides a revealed password', () => {
        const loginForm = new LoginForm();
        loginForm.element.querySelector<HTMLButtonElement>('[data-password-toggle]')?.click();

        loginForm.reset();

        expect(input(loginForm.element, 'password').type).toBe('password');
    });

    it('reset clears values, errors, aria state and disables submit again', () => {
        const loginForm = new LoginForm();
        type(loginForm.element, 'email', 'bad');
        type(loginForm.element, 'password', 'x');

        loginForm.reset();

        expect(input(loginForm.element, 'email').value).toBe('');
        expect(errorOf(loginForm.element, 'email').hidden).toBe(true);
        expect(input(loginForm.element, 'email').hasAttribute('aria-invalid')).toBe(false);
        expect(submitButton(loginForm.element).disabled).toBe(true);
    });
});

describe('RegisterForm', () => {
    let form: HTMLFormElement;
    let registerForm: RegisterForm;
    const onSubmit = vi.fn();

    function fillValid(): void {
        type(form, 'username', 'Alex99');
        type(form, 'email', 'alex@minigames.com');
        type(form, 'password', 'Abcde1!');
        type(form, 'confirmPassword', 'Abcde1!');
    }

    beforeEach(() => {
        onSubmit.mockClear();
        registerForm = new RegisterForm({ onSubmit });
        form = registerForm.element;
    });

    it('shows the username rules inline', () => {
        type(form, 'username', 'alex');
        expect(errorOf(form, 'username').textContent).toBe(Message.usernameStart);

        type(form, 'username', 'Alex_');
        expect(errorOf(form, 'username').textContent).toBe(Message.usernameChars);

        type(form, 'username', 'Alex');
        expect(errorOf(form, 'username').hidden).toBe(true);
    });

    it('shows the password strength rules inline', () => {
        type(form, 'password', 'abcdef');
        expect(errorOf(form, 'password').textContent).toBe(Message.passwordUppercase);
    });

    it('revalidates the confirm field whenever the password changes', () => {
        type(form, 'password', 'Abcde1!');
        type(form, 'confirmPassword', 'Abcde1!');
        expect(errorOf(form, 'confirmPassword').hidden).toBe(true);

        type(form, 'password', 'Abcde1?');
        expect(errorOf(form, 'confirmPassword').textContent).toBe(Message.confirmMismatch);

        type(form, 'password', 'Abcde1!');
        expect(errorOf(form, 'confirmPassword').hidden).toBe(true);
    });

    it('does not nag about the confirm field before the user touched it', () => {
        type(form, 'password', 'Abcde1!');

        expect(errorOf(form, 'confirmPassword').hidden).toBe(true);
    });

    it('enables submit only when every field is valid', () => {
        type(form, 'username', 'Alex99');
        type(form, 'email', 'alex@minigames.com');
        type(form, 'password', 'Abcde1!');
        expect(submitButton(form).disabled).toBe(true);

        type(form, 'confirmPassword', 'Abcde1!');
        expect(submitButton(form).disabled).toBe(false);
    });

    it('submits the four values when valid', () => {
        fillValid();

        submit(form);

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({
            username: 'Alex99',
            email: 'alex@minigames.com',
            password: 'Abcde1!',
            confirmPassword: 'Abcde1!',
        });
    });

    it('reset wipes the whole form', () => {
        fillValid();
        type(form, 'email', 'broken');

        registerForm.reset();

        for (const name of ['username', 'email', 'password', 'confirmPassword']) {
            expect(input(form, name).value).toBe('');
            expect(errorOf(form, name).hidden).toBe(true);
        }
        expect(submitButton(form).disabled).toBe(true);
    });
});

describe('AuthForm markup contract', () => {
    class BrokenForm extends AuthForm<{ email: string }> {
        constructor(markup: SafeHtml) {
            super(markup, { email: [] });
        }
    }

    it('fails fast when a field input is missing', () => {
        expect(() => new BrokenForm(html`<button type="submit"></button>`)).toThrow(
            'input[name="email"]',
        );
    });

    it('fails fast when the error slot is missing', () => {
        expect(
            () => new BrokenForm(html`<input name="email"><button type="submit"></button>`),
        ).toThrow('data-field-error="email"');
    });

    it('fails fast when the submit button is missing', () => {
        expect(() => new BrokenForm(html`<input name="email">`)).toThrow('button[type="submit"]');
    });
});
