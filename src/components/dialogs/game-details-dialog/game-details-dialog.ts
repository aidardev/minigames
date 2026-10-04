import { isNotFoundError } from '@/api/api-error';
import { getComments } from '@/api/comments';
import { getGameDetails } from '@/api/game-details';
import closeIcon from '@/assets/icons/close-alt.svg?raw';
import { AsyncRegion } from '@/components/async-region/async-region';
import { EmptyState } from '@/components/empty-state/empty-state';
import type { GameComments, GameDetails } from '@/types/game-details.types';
import { html, unsafeHtml } from '@/utils/html';
import { Dialog } from '../dialog';
import { CommentsSection } from './comments-section';
import { CommentsSkeleton } from './comments-skeleton';
import { GameDetailsContent } from './game-details-content';
import './game-details-dialog.scss';
import { GameDetailsSkeleton } from './game-details-skeleton';

export interface GameDetailsDialogProperties {
    slug: string;
}

export class GameDetailsDialog extends Dialog {
    private readonly detailsRegion: AsyncRegion<GameDetails>;
    private readonly commentsRegion: AsyncRegion<GameComments>;

    private readonly handleActionClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        if (event.target.closest('[data-action="close"]')) this.close();
    };

    constructor({ slug }: GameDetailsDialogProperties) {
        super({
            label: 'Game Details',
            modifier: 'dialog--game-details',
        });

        this.setContent(html`
            <div class="game-details">
                <button
                    class="game-details__close dialog__close btn btn--icon"
                    type="button"
                    data-action="close"
                    aria-label="Close game details"
                >
                    ${unsafeHtml(closeIcon)}
                </button>
            </div>
        `);

        this.detailsRegion = this.adopt(
            new AsyncRegion<GameDetails>(
                {
                    load: (signal: AbortSignal): Promise<GameDetails> =>
                        getGameDetails(slug, signal),
                    renderSkeleton: (): GameDetailsSkeleton => new GameDetailsSkeleton(),
                    renderSuccess: (game: GameDetails): GameDetailsContent =>
                        new GameDetailsContent(game),
                    renderError: (error: unknown): EmptyState | undefined =>
                        isNotFoundError(error) ? this.createGameNotFound() : undefined,
                },
                'game-details__content-region',
            ),
        );

        this.commentsRegion = this.adopt(
            new AsyncRegion<GameComments>(
                {
                    load: (signal: AbortSignal): Promise<GameComments> => getComments(slug, signal),
                    renderSkeleton: (): CommentsSkeleton => new CommentsSkeleton(),
                    renderSuccess: (data: GameComments): CommentsSection =>
                        new CommentsSection(data),
                    renderError: (error) =>
                        isNotFoundError(error) ? document.createElement('div') : undefined,
                },
                'game-details__comments-region',
            ),
        );

        this.query('.game-details')?.append(this.detailsRegion.element);
        this.query('.game-details')?.append(this.commentsRegion.element);

        this.element.addEventListener('click', this.handleActionClick);

        this.detailsRegion.load();
        this.commentsRegion.load();
    }

    private createGameNotFound(): EmptyState {
        return new EmptyState({
            title: 'Game not found',
            description: 'This game doesn’t exist or may have been removed.',
            action: { label: 'Close', onClick: (): void => this.close() },
        });
    }
}
