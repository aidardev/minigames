// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AuthDialog, toAuthTab, type AuthTab } from './auth-dialog';
import type { LoginValues } from './auth-validation';

function query<E extends HTMLElement>(dialog: AuthDialog, selector: string): E {
    const element = dialog.element.querySelector<E>(selector);
    if (!element) throw new Error(`Not found: ${selector}`);
    return element;
}

function emailInput(dialog: AuthDialog, tab: AuthTab): HTMLInputElement {
    return query<HTMLInputElement>(dialog, `[data-auth-panel="${tab}"] input[name="email"]`);
}

function type(element: HTMLInputElement, value: string): void {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickTab(dialog: AuthDialog, tab: AuthTab): void {
    query<HTMLButtonElement>(dialog, `.auth__tab[data-auth-tab="${tab}"]`).click();
}

describe('toAuthTab', () => {
    it('maps "register" to register and everything else to login', () => {
        expect(toAuthTab('register')).toBe('register');
        expect(toAuthTab('login')).toBe('login');
        expect(toAuthTab('anything')).toBe('login');
        expect(toAuthTab(undefined)).toBe('login');
    });
});

describe('AuthDialog', () => {
    let dialog: AuthDialog;
    const onTabChange = vi.fn();

    beforeEach(() => {
        onTabChange.mockClear();
        dialog = new AuthDialog({ onTabChange });
    });

    it('shows the initial tab only', () => {
        const register = new AuthDialog({ initialTab: 'register' });

        expect(query(dialog, '[data-auth-panel="login"]').hidden).toBe(false);
        expect(query(dialog, '[data-auth-panel="register"]').hidden).toBe(true);
        expect(query(register, '[data-auth-panel="register"]').hidden).toBe(false);
        expect(query(register, '[data-auth-panel="login"]').hidden).toBe(true);
    });

    it('marks the active tab with aria-selected', () => {
        clickTab(dialog, 'register');

        expect(query(dialog, '#auth-tab-register').getAttribute('aria-selected')).toBe('true');
        expect(query(dialog, '#auth-tab-login').getAttribute('aria-selected')).toBe('false');
    });

    it('notifies about user-initiated tab switches only', () => {
        clickTab(dialog, 'register');
        expect(onTabChange).toHaveBeenCalledTimes(1);
        expect(onTabChange).toHaveBeenCalledWith('register');

        dialog.setTab('login');
        expect(onTabChange).toHaveBeenCalledTimes(1);
    });

    it('clears the fields and errors of the form being left', () => {
        const email = emailInput(dialog, 'login');
        type(email, 'broken');
        expect(query(dialog, '[data-auth-panel="login"] [data-field-error="email"]').hidden).toBe(
            false,
        );

        clickTab(dialog, 'register');
        clickTab(dialog, 'login');

        expect(email.value).toBe('');
        expect(query(dialog, '[data-auth-panel="login"] [data-field-error="email"]').hidden).toBe(
            true,
        );
    });

    it('clears the form being entered as well', () => {
        clickTab(dialog, 'register');
        const email = emailInput(dialog, 'register');
        type(email, 'broken');

        dialog.setTab('login');
        dialog.setTab('register');

        expect(email.value).toBe('');
    });

    it('does not wipe the form when the active tab is selected again', () => {
        const email = emailInput(dialog, 'login');
        type(email, 'alex@minigames.com');

        clickTab(dialog, 'login');
        dialog.setTab('login');

        expect(email.value).toBe('alex@minigames.com');
    });

    it('switches via the links inside the forms too', () => {
        query<HTMLButtonElement>(
            dialog,
            '[data-auth-panel="login"] .auth-form__switch button',
        ).click();

        expect(query(dialog, '[data-auth-panel="register"]').hidden).toBe(false);
        expect(onTabChange).toHaveBeenCalledWith('register');
    });

    it('ignores clicks that are not on a tab trigger', () => {
        query(dialog, '.auth__tabs').click();

        expect(onTabChange).not.toHaveBeenCalled();
    });

    it('removes itself and its forms from the DOM on destroy', () => {
        document.body.append(dialog.element);

        dialog.destroy();

        expect(dialog.element.isConnected).toBe(false);
    });
});

describe('AuthDialog pending state', () => {
    const CREDENTIALS = { email: 'alex@minigames.com', password: 'secret' };
    let dialog: AuthDialog;
    let finish: () => void;
    let onLogin: Mock<(values: Readonly<LoginValues>) => Promise<void>>;

    function loginForm(): HTMLFormElement {
        return query<HTMLFormElement>(dialog, '[data-auth-panel="login"] form');
    }

    function submitLogin(): void {
        type(emailInput(dialog, 'login'), CREDENTIALS.email);
        type(
            query<HTMLInputElement>(dialog, '[data-auth-panel="login"] input[name="password"]'),
            CREDENTIALS.password,
        );
        loginForm().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    }

    function tabButton(tab: AuthTab): HTMLButtonElement {
        return query<HTMLButtonElement>(dialog, `.auth__tab[data-auth-tab="${tab}"]`);
    }

    function pressEscape(): KeyboardEvent {
        const event = new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
        });
        dialog.element.dispatchEvent(event);
        return event;
    }

    function cancel(): Event {
        const event = new Event('cancel', { cancelable: true });
        dialog.element.dispatchEvent(event);
        return event;
    }

    function clickBackdrop(): void {
        dialog.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        dialog.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    beforeEach(() => {
        const { promise, resolve } = Promise.withResolvers<void>();

        onLogin = vi.fn<(values: Readonly<LoginValues>) => Promise<void>>(() => promise);
        finish = resolve;

        dialog = new AuthDialog({ onLogin });
    });

    it('can be dismissed when nothing is pending', () => {
        const close = vi.spyOn(dialog, 'close').mockImplementation((): void => undefined);

        clickBackdrop();

        expect(close).toHaveBeenCalledOnce();
        expect(cancel().defaultPrevented).toBe(false);
        expect(pressEscape().defaultPrevented).toBe(false);
    });

    it('passes the validated values to onLogin', () => {
        submitLogin();

        expect(onLogin).toHaveBeenCalledOnce();
        expect(onLogin).toHaveBeenCalledWith(CREDENTIALS);
    });

    it('cannot be dismissed while the request is pending', () => {
        const close = vi.spyOn(dialog, 'close').mockImplementation((): void => undefined);

        submitLogin();
        clickBackdrop();

        expect(close).not.toHaveBeenCalled();
        expect(cancel().defaultPrevented).toBe(true);
        expect(pressEscape().defaultPrevented).toBe(true);
    });

    it('locks the tabs and the form while the request is pending', () => {
        submitLogin();

        expect(tabButton('login').disabled).toBe(true);
        expect(tabButton('register').disabled).toBe(true);
        expect(emailInput(dialog, 'login').disabled).toBe(true);
        expect(query<HTMLButtonElement>(dialog, 'button[type="submit"]').disabled).toBe(true);
    });

    it('unlocks everything once the request settles', async () => {
        const close = vi.spyOn(dialog, 'close').mockImplementation((): void => undefined);
        submitLogin();

        finish();

        await vi.waitFor((): void => expect(tabButton('register').disabled).toBe(false));
        expect(emailInput(dialog, 'login').disabled).toBe(false);
        expect(cancel().defaultPrevented).toBe(false);
        clickBackdrop();
        expect(close).toHaveBeenCalledOnce();
    });

    it('works without handlers', () => {
        const bare = new AuthDialog();
        const form = query<HTMLFormElement>(bare, '[data-auth-panel="login"] form');
        type(emailInput(bare, 'login'), CREDENTIALS.email);
        type(
            query<HTMLInputElement>(bare, '[data-auth-panel="login"] input[name="password"]'),
            CREDENTIALS.password,
        );

        expect(() =>
            form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true })),
        ).not.toThrow();
    });
});

describe('AuthDialog Google sign-in', () => {
    let dialog: AuthDialog;
    let finish: () => void;
    let onGoogleLogin: Mock<() => Promise<void>>;

    function googleButton(tab: AuthTab): HTMLButtonElement {
        return query<HTMLButtonElement>(dialog, `[data-auth-panel="${tab}"] [data-auth-google]`);
    }

    beforeEach(() => {
        const { promise, resolve } = Promise.withResolvers<void>();
        finish = resolve;
        onGoogleLogin = vi.fn<() => Promise<void>>(() => promise);
        dialog = new AuthDialog({ onGoogleLogin });
    });

    it.each<AuthTab>(['login', 'register'])('starts Google sign-in from the %s form', (tab) => {
        googleButton(tab).click();

        expect(onGoogleLogin).toHaveBeenCalledOnce();
    });

    it('locks the whole dialog while Google sign-in is pending', () => {
        const close = vi.spyOn(dialog, 'close').mockImplementation((): void => undefined);

        googleButton('login').click();
        dialog.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        dialog.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(googleButton('login').disabled).toBe(true);
        expect(googleButton('register').disabled).toBe(true);
        expect(emailInput(dialog, 'login').disabled).toBe(true);
        expect(
            query<HTMLButtonElement>(dialog, '.auth__tab[data-auth-tab="register"]').disabled,
        ).toBe(true);
        expect(close).not.toHaveBeenCalled();
    });

    it('does not rename the submit button while Google sign-in is pending', () => {
        googleButton('login').click();

        expect(
            query<HTMLButtonElement>(dialog, '[data-auth-panel="login"] button[type="submit"]')
                .textContent,
        ).toBe('Login');
    });

    it('unlocks the dialog once Google sign-in settles', async () => {
        googleButton('login').click();

        finish();

        await vi.waitFor((): void => expect(googleButton('login').disabled).toBe(false));
        expect(emailInput(dialog, 'login').disabled).toBe(false);
    });

    it('ignores the Google button when there is no handler', () => {
        const bare = new AuthDialog();

        expect(() =>
            query<HTMLButtonElement>(bare, '[data-auth-panel="login"] [data-auth-google]').click(),
        ).not.toThrow();
        expect(emailInput(bare, 'login').disabled).toBe(false);
    });
});
