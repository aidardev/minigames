import { getLeaderboard } from '@/api/leaderboard';
import { AsyncRegion } from '@/components/async-region/async-region';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import type { LeaderboardPlayer } from '@/types/leaderboard.types';
import { html } from '@/utils/html';
import { LeaderboardTable } from './leaderboard-table';
import './leaderboard.scss';

export class LeaderboardSection extends BaseComponent {
    private readonly region: AsyncRegion<LeaderboardPlayer[]>;

    constructor() {
        super('section', 'section section-leaderboard');

        this.setHtml(html`
            <div class="container">
                <div class="section-header">
                    <h2 class="section-header__title section-title">
                        Top Players<span class="section-leaderboard__title-extra"> This Week</span>
                    </h2>
                </div>
            </div>
        `);

        this.region = this.adopt(
            new AsyncRegion<LeaderboardPlayer[]>({
                load: (signal: AbortSignal): Promise<LeaderboardPlayer[]> => getLeaderboard(signal),
                renderSkeleton: (): LeaderboardTable => LeaderboardTable.skeleton(),
                renderSuccess: (players: LeaderboardPlayer[]): LeaderboardTable =>
                    LeaderboardTable.fromPlayers(players),
                renderEmpty: (): EmptyState =>
                    new EmptyState({
                        title: 'No players yet',
                        description: 'The leaderboard is empty for now. Check back soon.',
                    }),
            }),
        );

        this.query('.container')?.append(this.region.element);

        this.region.load();
    }
}
