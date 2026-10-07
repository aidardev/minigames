// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthDialog, toAuthTab, type AuthTab } from './auth-dialog';

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
