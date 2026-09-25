import chatIcon from '@/assets/icons/chat.svg?raw';
import rssIcon from '@/assets/icons/rss-feed.svg?raw';
import shareIcon from '@/assets/icons/share.svg?raw';
import codeIcon from '@/assets/icons/white-code-circle.svg?raw';
import logo from '@/assets/images/logo.svg';
import rsLogo from '@/assets/images/rs-logo.svg';
import { BaseComponent } from '../base-component';
import './footer.scss';

export class Footer extends BaseComponent {
    constructor() {
        super('footer', 'footer');

        this.element.innerHTML = /* HTML */ `
            <div class="footer__inner container">
                <div class="footer__top">
                    <div class="footer__brand">
                        <a href="/" class="footer__logo logo logo--white" data-link>
                            <img src="${logo}" alt="" class="logo__img" width="32" height="32">
                            <span class="logo__text">MiniGames</span>
                        </a>
                        <p class="footer__text">
                            Take a short break and have fun. Hundreds of curated casual mini-games
                            right in your web browser. No download required.
                        </p>
                    </div>

                    <nav class="footer__nav">
                        <div class="footer__group">
                            <h2 class="footer__title">Explore</h2>
                            <ul class="footer__list list-unstyled">
                                <li><a href="/" data-link>Home</a></li>
                                <li>
                                    <a href="/library" data-link>Library</a>
                                </li>
                                <li>
                                    <a href="/" data-link>Categories</a>
                                </li>
                                <li>
                                    <a href="/" data-link>Tournaments</a>
                                </li>
                            </ul>
                        </div>

                        <div class="footer__group">
                            <h2 class="footer__title">Company</h2>
                            <ul class="footer__list list-unstyled">
                                <li>
                                    <a href="/" data-link>About Us</a>
                                </li>
                                <li>
                                    <a href="/" data-link>Contact</a>
                                </li>
                                <li>
                                    <a href="/" data-link>Privacy Policy</a>
                                </li>
                                <li>
                                    <a href="/" data-link>Terms of Service</a>
                                </li>
                            </ul>
                        </div>

                        <div class="footer__group footer__group--community">
                            <h2 class="footer__title">Community</h2>
                            <ul class="footer__socials list-unstyled">
                                <li>
                                    <a
                                        href="/"
                                        class="footer__social-btn"
                                        aria-label="Share"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-link
                                        >${shareIcon}</a
                                    >
                                </li>
                                <li>
                                    <a
                                        href="/"
                                        class="footer__social-btn"
                                        aria-label="Community Chat"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-link
                                        >${chatIcon}</a
                                    >
                                </li>
                                <li>
                                    <a
                                        href="/"
                                        class="footer__social-btn"
                                        aria-label="RSS Feed"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        data-link
                                        >${rssIcon}</a
                                    >
                                </li>
                            </ul>
                        </div>
                    </nav>
                </div>

                <div class="footer__bottom">
                    <p class="footer__copyright">© 2026 MiniGames. All rights reserved.</p>

                    <a
                        href="https://rs.school/courses/short-track"
                        class="footer__credit"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <img
                            src="${rsLogo}"
                            alt=""
                            class="footer__credit-icon"
                            width="24"
                            height="24"
                        >
                        RS School
                    </a>

                    <a
                        href="https://github.com/aidardev"
                        class="footer__credit"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ${codeIcon} @aidardev
                    </a>

                    <p class="footer__attribution">Designed with love</p>
                </div>
            </div>
        `;
    }
}
