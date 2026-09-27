import { BaseComponent } from '@/components/base-component';
import './hero.scss';

export class HeroSection extends BaseComponent {
    constructor() {
        super('section', 'section-hero');

        this.element.innerHTML = /* HTML */ `
            <div class="hero container">
                <div class="hero__card">
                    <h1 class="hero__title">Take a Short Break &amp;&nbsp;Have Fun</h1>
                    <p class="hero__text hero__text--desktop">
                        Discover hundreds of curated casual mini-games. Play instantly in your
                        browser — puzzle, match 3, farm, and board classics.
                    </p>
                    <p class="hero__text hero__text--mobile">
                        Discover hundreds of curated casual mini-games right in your browser.
                    </p>
                    <a href="/library" class="hero__btn btn btn--large btn--primary" data-link>
                        Browse Library
                    </a>
                </div>
            </div>
        `;
    }
}
