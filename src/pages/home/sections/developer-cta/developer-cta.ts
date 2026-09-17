import uploadIcon from '@/assets/icons/upload.svg?raw';
import image from '@/assets/images/illustration-side.png';
import { BaseComponent } from '@/components/base-component';
import './developer-cta.scss';

export class DeveloperCtaSection extends BaseComponent {
    constructor() {
        super('section', 'section-developer-cta');

        this.element.innerHTML = /* HTML */ `
            <div class="developer-cta container">
                <img
                    src="${image}"
                    alt="Illustration image"
                    class="developer-cta__img img-responsive"
                    width="680"
                    height="480"
                >
                <div class="developer-cta__card">
                    <div class="developer-cta__card-content">
                        <h2 class="developer-cta__title">Are You a Game Developer?</h2>
                        <p class="developer-cta__text">
                            Want to see your game on MiniGames? We're always looking for fun,
                            engaging mini games to add to our platform. Submit your game and reach
                            thousands of players!
                        </p>
                        <button
                            class="developer-cta__btn btn btn--large btn--primary"
                            type="button"
                        >
                            ${uploadIcon} Submit Form
                        </button>
                        <p class="developer-cta__hint">
                            or contact us at
                            <a href="mailto:developers@minigames.com">developers@minigames.com</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
}
