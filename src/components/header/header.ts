import { handleLogout } from '@/app/auth-flow';
import { openAuth } from '@/app/navigation';
import closeIcon from '@/assets/icons/close.svg?raw';
import burgerIcon from '@/assets/icons/menu.svg?raw';
import logo from '@/assets/images/logo.svg';
import type { AppSession, SessionListener } from '@/services/session/session.types';
import { html, unsafeHtml } from '@/utils/html';
import { getProfileView } from '@/utils/profile/profile';
import { BaseComponent } from '../base-component';
import { toAuthTab, type AuthTab } from '../dialogs/auth-dialog/auth-dialog';
import { ProfileAvatar } from '../profile-avatar/profile-avatar';
import './header.scss';

// The header only needs to observe the session, so tests can pass a fake instead of the real store.
export interface SessionSource {
    subscribe: (listener: SessionListener) => () => void;
}

export interface HeaderOptions {
    session: SessionSource;
}

export class Header extends BaseComponent {
    private isMenuOpen = false;

    private burgerBtn: HTMLButtonElement | undefined = undefined;
    private closeBtn: HTMLButtonElement | undefined = undefined;
    private menuContainer: HTMLElement | undefined = undefined;
    private navLinks: HTMLAnchorElement[] = [];

    private guestControls: HTMLElement[] = [];
    private authControls: HTMLElement[] = [];
    private readonly profileName: HTMLElement;
    private readonly avatar = this.adopt(new ProfileAvatar());
    private readonly unsubscribeSession: () => void;

    private handleDocumentClick = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof Node)) return;

        const isClickOutside = !this.element.contains(target);
        if (isClickOutside) {
            this.closeMenu();
        }
    };

    private handleEscKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            this.closeMenu();
        }
    };

    private handleAuthClick = (event: Event): void => {
        if (!(event.target instanceof Element)) return;

        const trigger = event.target.closest<HTMLElement>('[data-auth-tab]');
        if (!trigger) return;

        const tab: AuthTab = toAuthTab(trigger.dataset.authTab);

        this.closeMenu();
        openAuth(tab);
    };

    private handleLogoutClick = (event: Event): void => {
        if (!(event.target instanceof Element)) return;
        if (!event.target.closest('[data-logout]')) return;

        this.closeMenu();
        void handleLogout();
    };

    private handleLinksClick = (event: Event): void => {
        if (!(event.target instanceof Element)) return;

        const trigger = event.target.closest<HTMLElement>('a');
        if (!trigger) return;

        this.closeMenu();
    };

    constructor({ session }: HeaderOptions) {
        super('header', 'header');

        this.setHtml(html`
            <div class="header__inner container">
                <a href="/" class="header__logo logo logo--dark" data-link>
                    <img src="${logo}" alt="" class="logo__img" width="32" height="32">
                    <span class="logo__text">MiniGames</span>
                </a>
                <div class="header__menu" id="mobile-menu">
                    <div class="header__mobile-topbar">
                        <a href="/" class="header__logo-mobile logo logo--white" data-link>
                            <img src="${logo}" alt="" class="logo__img" width="32" height="32">
                            <span class="logo__text">MiniGames</span>
                        </a>
                        <button class="header__close btn" type="button" aria-label="Close menu">
                            ${unsafeHtml(closeIcon)}
                        </button>
                    </div>
                    <nav class="header__navbar navbar">
                        <ul class="navbar__list list-unstyled">
                            <li><a href="/" data-link data-route="/">Home</a></li>
                            <li><a href="/library" data-link data-route="/library">Library</a></li>
                            <li><a href="/" data-link>Tournaments</a></li>
                            <li><a href="/" data-link>Community</a></li>
                        </ul>
                    </nav>
                    <div class="header__profile" data-header-auth hidden>
                        <span class="header__profile-name" data-profile-name></span>
                        <span data-profile-avatar></span>
                    </div>
                    <div class="header__btns">
                        <button
                            class="header__btn btn btn--medium btn--outline-on-primary"
                            type="button"
                            data-auth-tab="login"
                            data-header-guest
                        >
                            Log In
                        </button>
                        <button
                            class="header__btn btn btn--medium btn--primary"
                            type="button"
                            data-auth-tab="register"
                            data-header-guest
                        >
                            Sign Up
                        </button>
                        <button
                            class="header__btn btn btn--medium btn--outline-on-primary"
                            type="button"
                            data-logout
                            data-header-auth
                            hidden
                        >
                            Log Out
                        </button>
                    </div>
                </div>
                <button
                    class="header__btn header__btn--tablet btn btn--small btn--primary"
                    type="button"
                    data-auth-tab="register"
                    data-header-guest
                >
                    Sign Up
                </button>
                <button
                    class="header__btn header__btn--tablet btn btn--small btn--outline-on-primary"
                    type="button"
                    data-logout
                    data-header-auth
                    hidden
                >
                    Log Out
                </button>
                <button
                    class="header__hamburger-btn btn btn--icon btn--outline-on-primary"
                    type="button"
                    aria-label="Open menu"
                    aria-expanded="false"
                    aria-controls="mobile-menu"
                >
                    ${unsafeHtml(burgerIcon)}
                </button>
            </div>
        `);

        this.profileName = this.getElement('[data-profile-name]');

        this.initElements();
        this.initProfile();
        this.bindEvents();

        this.unsubscribeSession = session.subscribe((current): void => this.renderSession(current));
    }

    private initElements(): void {
        this.burgerBtn = this.query('.header__hamburger-btn');
        this.closeBtn = this.query('.header__close');
        this.menuContainer = this.query('.header__menu');
        this.navLinks = [
            ...this.element.querySelectorAll<HTMLAnchorElement>(
                ':scope .navbar__list a[data-route]',
            ),
        ];
    }

    private initProfile(): void {
        this.guestControls = [...this.element.querySelectorAll<HTMLElement>('[data-header-guest]')];
        this.authControls = [...this.element.querySelectorAll<HTMLElement>('[data-header-auth]')];
        this.query('[data-profile-avatar]')?.append(this.avatar.element);
    }

    private bindEvents(): void {
        this.burgerBtn?.addEventListener('click', (): void => this.openMenu());
        this.closeBtn?.addEventListener('click', (): void => this.closeMenu());
        this.element.addEventListener('click', this.handleAuthClick);
        this.element.addEventListener('click', this.handleLogoutClick);
        this.menuContainer?.addEventListener('click', this.handleLinksClick);
    }

    private renderSession(session: AppSession | undefined): void {
        const isAuthenticated = session !== undefined;

        for (const control of this.guestControls) control.hidden = isAuthenticated;
        for (const control of this.authControls) control.hidden = !isAuthenticated;

        if (!isAuthenticated) return;

        const { name, initials } = getProfileView(session);

        this.profileName.textContent = name;
        this.avatar.update({ avatarUrl: session.avatarUrl, initials });
    }

    public setActivePath(path: string): void {
        for (const link of this.navLinks) {
            const isActive = link.dataset.route === path;
            link.closest('li')?.classList.toggle('is-active', isActive);
        }
    }

    public openMenu(): void {
        if (this.isMenuOpen) return;

        this.isMenuOpen = true;
        this.menuContainer?.classList.add('is-open');
        this.burgerBtn?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('is-locked');

        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleEscKey);
    }

    public closeMenu(): void {
        if (!this.isMenuOpen) return;

        this.isMenuOpen = false;
        this.menuContainer?.classList.remove('is-open');
        this.burgerBtn?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');

        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleEscKey);
    }

    public override destroy(): void {
        this.unsubscribeSession();
        super.destroy();
    }
}
