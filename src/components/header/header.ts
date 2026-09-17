import closeIcon from '@/assets/icons/close.svg?raw';
import burgerIcon from '@/assets/icons/menu.svg?raw';
import logo from '@/assets/images/logo.svg';
import { BaseComponent } from '../base-component';
import './header.scss';

export class Header extends BaseComponent {
    public constructor() {
        super('header', 'header');

        this.element.innerHTML = /* HTML */ `
            <div class="header__inner container">
                <a href="#" class="header__logo logo logo--dark">
                    <img src="${logo}" alt="Logo" class="logo__img" width="32" height="32">
                    <span class="logo__text">MiniGames</span>
                </a>
                <div class="header__menu">
                    <div class="header__mobile-topbar">
                        <a href="#" class="header__logo-mobile logo logo--white">
                            <img src="${logo}" alt="Logo" class="logo__img" width="32" height="32">
                            <span class="logo__text">MiniGames</span>
                        </a>
                        <button class="header__close" type="button">${closeIcon}</button>
                    </div>
                    <nav class="header__navbar navbar">
                        <ul class="navbar__list list-unstyled">
                            <li class="is-active"><a href="#">Home</a></li>
                            <li><a href="#">Library</a></li>
                            <li><a href="#">Tournaments</a></li>
                            <li><a href="#">Community</a></li>
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
                <button class="header__hamburger-btn btn btn--icon" type="button">
                    ${burgerIcon}
                </button>
            </div>
        `;
    }
}
