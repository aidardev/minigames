import { BaseComponent } from '@/components/base-component';
import { formatCompactNumber, formatNumber } from '@/utils/formatters';
import { getInitials } from '@/utils/string';
import { LEADERBOARD_MOCK } from './leaderboard.mock';
import './leaderboard.scss';

export class LeaderboardSection extends BaseComponent {
    constructor() {
        super('section', 'section section-leaderboard');

        this.element.innerHTML = /* HTML */ `
            <div class="container">
                <div class="section-header">
                    <h2 class="section-header__title section-title">
                        Top Players<span class="section-leaderboard__title-extra"> This Week</span>
                    </h2>
                </div>

                <div class="leaderboard-table-container">
                    <table class="leaderboard-table">
                        <thead class="leaderboard-table__head">
                            <tr>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--rank"
                                >
                                    Rank
                                </th>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--player"
                                >
                                    Player
                                </th>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--games"
                                >
                                    <span class="leaderboard-table__text-full">Games Played</span>
                                    <span class="leaderboard-table__text-short">Games</span>
                                </th>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--score"
                                >
                                    <span class="leaderboard-table__text-full">Total Score</span>
                                    <span class="leaderboard-table__text-short">Score</span>
                                </th>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--streak"
                                >
                                    Streak
                                </th>
                                <th
                                    scope="col"
                                    class="leaderboard-table__col leaderboard-table__col--favorite"
                                >
                                    Favorite Game
                                </th>
                            </tr>
                        </thead>
                        <tbody class="leaderboard-table__body">
                            ${this.renderRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    private renderRows(): string {
        return LEADERBOARD_MOCK.map((player) => {
            const initials = getInitials(player.playerName);
            const formattedScore = formatNumber(player.totalScore);
            const shortScore = formatCompactNumber(player.totalScore);

            return /* HTML */ `
                <tr class="leaderboard-table__row">
                    <td class="leaderboard-table__cell leaderboard-table__col--rank">
                        <span class="leaderboard-table__rank-val">#${player.rank}</span>
                    </td>
                    <td class="leaderboard-table__cell leaderboard-table__col--player">
                        <div class="leaderboard-table__player-info">
                            <span class="leaderboard-table__avatar">${initials}</span>
                            <span class="leaderboard-table__username">${player.playerName}</span>
                        </div>
                    </td>
                    <td class="leaderboard-table__cell leaderboard-table__col--games">
                        ${player.gamesPlayed}
                    </td>
                    <td class="leaderboard-table__cell leaderboard-table__col--score">
                        <span class="leaderboard-table__text-full">${formattedScore}</span>
                        <span class="leaderboard-table__text-short">${shortScore}</span>
                    </td>
                    <td class="leaderboard-table__cell leaderboard-table__col--streak">
                        <span class="leaderboard-table__streak">
                            🔥 ${player.streakDays}<span class="leaderboard-table__text-full">
                                days</span
                            ><span class="leaderboard-table__text-short">d</span>
                        </span>
                    </td>
                    <td class="leaderboard-table__cell leaderboard-table__col--favorite">
                        <span class="leaderboard-table__badge">${player.favoriteGameName}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }
}
