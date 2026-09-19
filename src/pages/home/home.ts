import { BaseComponent } from '@/components/base-component';
import { DeveloperCtaSection } from './sections/developer-cta/developer-cta';
import { HeroSection } from './sections/hero/hero';
import { NewGamesSection } from './sections/new-games/new-games';

export class HomePage extends BaseComponent {
    public constructor() {
        super('main', 'home-page');

        this.element.append(
            new HeroSection().element,
            new NewGamesSection().element,
            new DeveloperCtaSection().element,
        );
    }
}
