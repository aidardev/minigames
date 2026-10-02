import { BaseComponent } from '@/components/base-component';
import { DeveloperCtaSection } from './sections/developer-cta/developer-cta';
import { HeroSection } from './sections/hero/hero';
import { LeaderboardSection } from './sections/leaderboard/leaderboard';
import { NewGamesSection } from './sections/new-games/new-games';

export class HomePage extends BaseComponent {
    constructor() {
        super('main', 'home-page');

        this.element.append(
            this.adopt(new HeroSection()).element,
            this.adopt(new NewGamesSection()).element,
            this.adopt(new LeaderboardSection()).element,
            this.adopt(new DeveloperCtaSection()).element,
        );
    }
}
