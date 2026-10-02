import { BaseComponent } from '@/components/base-component';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import type { LeaderboardPlayer } from '@/types/leaderboard.types';
import { formatCompactNumber, formatNumber } from '@/utils/formatters';
import { html, type SafeHtml } from '@/utils/html';
import { getInitials } from '@/utils/string';

const SKELETON_ROW_COUNT = 5;

// Static markup: built once and shared by the real table and the skeleton,
// so both always have identical columns.
const TABLE_HEAD = html`
    <thead class="leaderboard-table__head">
        <tr>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--rank">Rank</th>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--player">
                Player
            </th>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--games">
                <span class="leaderboard-table__text-full">Games Played</span>
                <span class="leaderboard-table__text-short">Games</span>
            </th>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--score">
                <span class="leaderboard-table__text-full">Total Score</span>
                <span class="leaderboard-table__text-short">Score</span>
            </th>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--streak">
                Streak
            </th>
            <th scope="col" class="leaderboard-table__col leaderboard-table__col--favorite">
                Favorite Game
            </th>
        </tr>
    </thead>
`;

function renderRow(player: LeaderboardPlayer): SafeHtml {
    const rankClass = player.rank === 1 ? ' leaderboard-table__row--top' : '';

    return html`
        <tr class="leaderboard-table__row${rankClass}">
            <td class="leaderboard-table__cell leaderboard-table__col--rank">
                <span class="leaderboard-table__rank-val">#${player.rank}</span>
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--player">
                <div class="leaderboard-table__player-info">
                    <span class="leaderboard-table__avatar avatar">
                        ${getInitials(player.playerName)}
                    </span>
                    <span class="leaderboard-table__username">${player.playerName}</span>
                </div>
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--games">
                ${player.gamesPlayed}
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--score">
                <span class="leaderboard-table__text-full">${formatNumber(player.totalScore)}</span>
                <span class="leaderboard-table__text-short">
                    ${formatCompactNumber(player.totalScore)}
                </span>
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--streak">
                <span class="leaderboard-table__streak">
                    🔥 ${player.streakDays}<span class="leaderboard-table__text-full"> days</span
                    ><span class="leaderboard-table__text-short">d</span>
                </span>
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--favorite">
                <span class="leaderboard-table__badge">${player.favoriteGameName}</span>
            </td>
        </tr>
    `;
}

// Reuses the real row/cell/column classes, so responsive rules (hidden columns and rows) apply as is.
function renderSkeletonRow(): SafeHtml {
    return html`
        <tr class="leaderboard-table__row">
            <td class="leaderboard-table__cell leaderboard-table__col--rank">
                ${skeletonHtml('leaderboard-table__skeleton leaderboard-table__skeleton--short')}
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--player">
                <div class="leaderboard-table__player-info">
                    ${skeletonHtml('leaderboard-table__skeleton leaderboard-table__skeleton--avatar')}
                    ${skeletonHtml('leaderboard-table__skeleton leaderboard-table__skeleton--wide')}
                </div>
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--games">
                ${skeletonHtml('leaderboard-table__skeleton leaderboard-table__skeleton--short')}
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--score">
                ${skeletonHtml('leaderboard-table__skeleton')}
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--streak">
                ${skeletonHtml('leaderboard-table__skeleton')}
            </td>
            <td class="leaderboard-table__cell leaderboard-table__col--favorite">
                ${skeletonHtml('leaderboard-table__skeleton leaderboard-table__skeleton--wide')}
            </td>
        </tr>
    `;
}

export class LeaderboardTable extends BaseComponent<'div'> {
    public static fromPlayers(players: readonly LeaderboardPlayer[]): LeaderboardTable {
        return new LeaderboardTable(
            html`${players.map((player: LeaderboardPlayer): SafeHtml => renderRow(player))}`,
        );
    }

    public static skeleton(): LeaderboardTable {
        const rows = Array.from({ length: SKELETON_ROW_COUNT }, (): SafeHtml =>
            renderSkeletonRow(),
        );
        const table = new LeaderboardTable(html`${rows}`);

        table.element.setAttribute('aria-hidden', 'true');

        return table;
    }

    // Private: instances are created through the factories above, which choose the rows.
    private constructor(rows: SafeHtml) {
        super('div', 'leaderboard-table-container');

        this.setHtml(html`
            <table class="leaderboard-table">
                ${TABLE_HEAD}
                <tbody class="leaderboard-table__body">
                    ${rows}
                </tbody>
            </table>
        `);
    }
}
