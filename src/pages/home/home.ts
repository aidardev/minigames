import { getLeaderboard } from '@/api/leaderboard';
import { BaseComponent } from '@/components/base-component';
import { DeveloperCtaSection } from './sections/developer-cta/developer-cta';
import { HeroSection } from './sections/hero/hero';
import { LeaderboardSection } from './sections/leaderboard/leaderboard';
import { NewGamesSection } from './sections/new-games/new-games';

export class HomePage extends BaseComponent {
    private readonly developerCta: DeveloperCtaSection;

    constructor() {
        super('main', 'home-page');

        this.developerCta = this.adopt(new DeveloperCtaSection());

        this.element.append(
            this.adopt(new HeroSection()).element,
            this.adopt(new NewGamesSection()).element,
            this.developerCta.element,
        );

        this.loadLeaderboard();
    }

    private async loadLeaderboard(): Promise<void> {
        const players = await getLeaderboard();
        const leaderboardSection = this.adopt(new LeaderboardSection(players));

        this.element.insertBefore(leaderboardSection.element, this.developerCta.element);
    }
}
