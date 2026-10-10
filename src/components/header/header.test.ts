// @vitest-environment jsdom
import { handleLogout } from '@/app/auth-flow';
import { openAuth } from '@/app/navigation';
import type { AppSession, SessionListener } from '@/services/session/session.types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './header';

vi.mock('@/app/navigation', () => ({ openAuth: vi.fn() }));
vi.mock('@/app/auth-flow', () => ({ handleLogout: vi.fn() }));

const SESSION: AppSession = {
    displayName: 'Alex Doe',
    email: 'alex@minigames.com',
    authenticatedAt: 0,
};

function createSessionSource(): {
    session: { subscribe: (listener: SessionListener) => () => void };
    emit: (session: AppSession | undefined) => void;
    unsubscribe: ReturnType<typeof vi.fn>;
} {
    let listener: SessionListener | undefined;
    const unsubscribe = vi.fn();

    return {
        session: {
            subscribe: (next): (() => void) => {
                listener = next;
                next(undefined);
                return unsubscribe;
            },
        },
        emit: (session): void => listener?.(session),
        unsubscribe,
    };
}

function query<E extends HTMLElement>(header: Header, selector: string): E {
    const element = header.element.querySelector<E>(selector);
    if (!element) throw new Error(`Not found: ${selector}`);
    return element;
}

function isVisible(header: Header, selector: string): boolean {
    return [...header.element.querySelectorAll<HTMLElement>(selector)].every(
        (element): boolean => !element.hidden,
    );
}

function isHidden(header: Header, selector: string): boolean {
    return [...header.element.querySelectorAll<HTMLElement>(selector)].every((element): boolean =>
        Boolean(element.hidden),
    );
}

describe('Header session state', () => {
    let source: ReturnType<typeof createSessionSource>;
    let header: Header;

    beforeEach(() => {
        vi.mocked(openAuth).mockClear();
        vi.mocked(handleLogout).mockClear();
        source = createSessionSource();
        header = new Header({ session: source.session });
    });

    it('shows the guest controls and hides the profile for a guest', () => {
        expect(isVisible(header, '[data-header-guest]')).toBe(true);
        expect(isHidden(header, '[data-header-auth]')).toBe(true);
    });

    it('replaces the guest controls with the profile once authenticated', () => {
        source.emit(SESSION);

        expect(isHidden(header, '[data-header-guest]')).toBe(true);
        expect(isVisible(header, '[data-header-auth]')).toBe(true);
    });

    it('shows Log Out only while a session is active', () => {
        expect(isHidden(header, '[data-logout]')).toBe(true);

        source.emit(SESSION);

        expect(isVisible(header, '[data-logout]')).toBe(true);
    });

    it('shows the display name and initials', () => {
        source.emit(SESSION);

        expect(query(header, '[data-profile-name]').textContent).toBe('Alex Doe');
        expect(query(header, '.profile-avatar').textContent).toBe('AD');
    });

    it('shows the photo when the session has an avatarUrl', () => {
        source.emit({ ...SESSION, avatarUrl: 'https://example.com/a.png' });

        expect(query(header, '.profile-avatar img').getAttribute('src')).toBe(
            'https://example.com/a.png',
        );
    });

    it('uses the part of the email before "@" when the name is empty', () => {
        source.emit({ ...SESSION, displayName: '' });

        expect(query(header, '[data-profile-name]').textContent).toBe('alex');
    });

    it('renders the name as text, never as markup', () => {
        source.emit({ ...SESSION, displayName: '<img src=x onerror=alert(1)>' });

        const name = query(header, '[data-profile-name]');

        expect(name.textContent).toBe('<img src=x onerror=alert(1)>');
        expect(name.querySelector('img')).toBeNull();
    });

    it('goes back to the guest controls when the session ends', () => {
        source.emit(SESSION);
        source.emit(undefined);

        expect(isVisible(header, '[data-header-guest]')).toBe(true);
        expect(isHidden(header, '[data-header-auth]')).toBe(true);
    });

    it('updates the profile when the session changes', () => {
        source.emit(SESSION);
        source.emit({ ...SESSION, displayName: 'Maria Lopez' });

        expect(query(header, '[data-profile-name]').textContent).toBe('Maria Lopez');
        expect(query(header, '.profile-avatar').textContent).toBe('ML');
    });

    it('stops listening to the session when destroyed', () => {
        header.destroy();

        expect(source.unsubscribe).toHaveBeenCalledOnce();
    });
});

describe('Header auth controls', () => {
    it('opens the matching auth tab from the guest buttons', () => {
        vi.mocked(openAuth).mockClear();
        const header = new Header({ session: createSessionSource().session });

        query<HTMLButtonElement>(header, '.header__btns [data-auth-tab="login"]').click();
        query<HTMLButtonElement>(header, '.header__btns [data-auth-tab="register"]').click();

        expect(openAuth).toHaveBeenNthCalledWith(1, 'login');
        expect(openAuth).toHaveBeenNthCalledWith(2, 'register');
    });
});

describe('Header logout control', () => {
    let header: Header;

    beforeEach(() => {
        vi.mocked(openAuth).mockClear();
        vi.mocked(handleLogout).mockClear();
        const source = createSessionSource();
        header = new Header({ session: source.session });
        source.emit(SESSION);
    });

    it('starts the logout flow without opening the auth dialog', () => {
        query<HTMLButtonElement>(header, '[data-logout]').click();

        expect(handleLogout).toHaveBeenCalledOnce();
        expect(openAuth).not.toHaveBeenCalled();
    });

    it('closes the open mobile menu', () => {
        header.openMenu();

        query<HTMLButtonElement>(header, '[data-logout]').click();

        expect(document.body.classList.contains('is-locked')).toBe(false);
    });
});
