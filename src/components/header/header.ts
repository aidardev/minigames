import closeIcon from '@/assets/icons/close.svg?raw';
import burgerIcon from '@/assets/icons/menu.svg?raw';
import logo from '@/assets/images/logo.svg';
import { BaseComponent } from '../base-component';
import './header.scss';

export class Header extends BaseComponent {
    private isMenuOpen = false;

    private burgerBtn: HTMLButtonElement | undefined = undefined;
    private closeBtn: HTMLButtonElement | undefined = undefined;
    private menuContainer: HTMLElement | undefined = undefined;

    private handleDocumentClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;

        const isClickOutside = !this.element.contains(target);
        if (isClickOutside) {
            this.closeMenu();
        }
    };

    private handleEscKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            this.closeMenu();
        }
    };

    public constructor() {
        super('header', 'header');

        this.element.innerHTML = /* HTML */ `
            <div class="header__inner container">
                <a href="/" class="header__logo logo logo--dark" data-link>
                    <img src="${logo}" alt="Logo" class="logo__img" width="32" height="32">
                    <span class="logo__text">MiniGames</span>
                </a>
                <div class="header__menu">
                    <div class="header__mobile-topbar">
                        <a href="/" class="header__logo-mobile logo logo--white" data-link>
                            <img src="${logo}" alt="Logo" class="logo__img" width="32" height="32">
                            <span class="logo__text">MiniGames</span>
                        </a>
                        <button class="header__close btn" type="button" aria-label="Close menu">
                            ${closeIcon}
                        </button>
                    </div>
                    <nav class="header__navbar navbar">
                        <ul class="navbar__list list-unstyled">
                            <li class="is-active"><a href="/" data-link>Home</a></li>
                            <li><a href="/" data-link>Library</a></li>
                            <li><a href="/" data-link>Tournaments</a></li>
                            <li><a href="/" data-link>Community</a></li>
                        </ul>
                    </nav>
                    <div class="header__btns">
                        <button
                            class="header__btn btn btn--medium btn--outline-on-primary"
                            type="button"
                        >
                            Log In
                        </button>
                        <button class="header__btn btn btn--medium btn--primary" type="button">
                            Sign Up
                        </button>
                    </div>
                </div>
                <button
                    class="header__btn header__btn--tablet btn btn--small btn--primary"
                    type="button"
                >
                    Sign Up
                </button>
                <button
                    class="header__hamburger-btn btn btn--icon btn--outline-on-primary"
                    type="button"
                    aria-label="Open menu"
                >
                    ${burgerIcon}
                </button>
            </div>
        `;

        this.initElements();
        this.bindEvents();
    }

    private initElements() {
        this.burgerBtn = this.query('.header__hamburger-btn');
        this.closeBtn = this.query('.header__close');
        this.menuContainer = this.query('.header__menu');
    }

    private bindEvents() {
        this.burgerBtn?.addEventListener('click', () => this.openMenu());
        this.closeBtn?.addEventListener('click', () => this.closeMenu());
    }

    public openMenu() {
        if (this.isMenuOpen) return;

        this.isMenuOpen = true;
        this.menuContainer?.classList.add('is-open');
        this.burgerBtn?.setAttribute('aria-expanded', 'true');

        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleEscKey);
    }

    public closeMenu() {
        if (!this.isMenuOpen) return;

        this.isMenuOpen = false;
        this.menuContainer?.classList.remove('is-open');
        this.burgerBtn?.setAttribute('aria-expanded', 'false');

        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleEscKey);
    }
}
