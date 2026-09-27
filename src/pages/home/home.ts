import { getLeaderboard } from '@/api/leaderboard';
import { BaseComponent } from '@/components/base-component';
import { DeveloperCtaSection } from './sections/developer-cta/developer-cta';
import { HeroSection } from './sections/hero/hero';
import { LeaderboardSection } from './sections/leaderboard/leaderboard';
import { NewGamesSection } from './sections/new-games/new-games';

export class HomePage extends BaseComponent {
    private readonly developerCta = new DeveloperCtaSection();

    constructor() {
        super('main', 'home-page');

        this.element.append(
            new HeroSection().element,
            new NewGamesSection().element,
            this.developerCta.element,
        );

        this.loadLeaderboard();
    }

    private async loadLeaderboard(): Promise<void> {
        const players = await getLeaderboard();
        const leaderboardSection = new LeaderboardSection(players);

        this.element.insertBefore(leaderboardSection.element, this.developerCta.element);
    }
}
