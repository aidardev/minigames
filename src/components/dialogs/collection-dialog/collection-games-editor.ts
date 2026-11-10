import deleteIcon from '@/assets/icons/delete.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { ErrorBanner } from '@/components/error-banner/error-banner';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import type { CollectionItem } from '@/types/collection.types';
import { html, unsafeHtml } from '@/utils/html';
import './collection-games-editor.scss';

export type LoadCollectionGames = () => Promise<readonly CollectionItem[] | undefined>;

interface CollectionGamesEditorOptions {
    loadGames: LoadCollectionGames;
    onChange: () => void;
}

export class CollectionGamesEditor extends BaseComponent<'section'> {
    private readonly loadGames: LoadCollectionGames;
    private readonly onChange: () => void;
    private readonly body: HTMLElement;
    private readonly removedSlugs = new Set<string>();
    private games: readonly CollectionItem[] | undefined;
    private errorBanner: ErrorBanner | undefined;
    private isDisabled = false;
    private isDisposed = false;
    private requestId = 0;

    private readonly handleClick = (event: MouseEvent): void => {
        if (this.isDisposed || this.isDisabled || !(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>('[data-remove-game]');
        const slug = button?.dataset.removeGame;
        const game = this.games?.find((item) => item.slug === slug);
        if (!button || !game) return;
        if (this.removedSlugs.has(game.slug)) this.removedSlugs.delete(game.slug);
        else this.removedSlugs.add(game.slug);
        const isRemoved = this.removedSlugs.has(game.slug);
        button.closest('li')?.classList.toggle('collection-games-editor__game--removed', isRemoved);
        button.setAttribute(
            'aria-label',
            `${isRemoved ? 'Undo removal of' : 'Remove'} ${game.title}`,
        );
        const label = button.querySelector('[data-remove-label]');
        if (label) label.textContent = isRemoved ? 'Undo' : 'Remove';
        this.onChange();
    };

    constructor({ loadGames, onChange }: CollectionGamesEditorOptions) {
        super('section', 'collection-games-editor');
        this.loadGames = loadGames;
        this.onChange = onChange;
        this.setHtml(html`
            <h3 class="collection-games-editor__title">Games</h3>
            <div class="collection-games-editor__body" aria-live="polite"></div>
        `);
        this.body = this.getElement('.collection-games-editor__body');
        this.element.addEventListener('click', this.handleClick);
        queueMicrotask((): void => {
            if (!this.isDisposed) void this.reload();
        });
    }

    private renderGames(): void {
        if (!this.games) return;
        this.body.innerHTML =
            this.games.length === 0
                ? html`<p class="collection-games-editor__empty">
                      No games in this collection yet.
                  </p>`.value
                : html`<ul class="collection-games-editor__list list-unstyled">
                      ${this.games.map(
                          (game) =>
                              html` <li
                                  class="collection-games-editor__game ${this.removedSlugs.has(game.slug) ? 'collection-games-editor__game--removed' : ''}"
                              >
                                  <img
                                      class="collection-games-editor__image"
                                      src="${game.image}"
                                      alt=""
                                      loading="lazy"
                                  >
                                  <span class="collection-games-editor__name">${game.title}</span>
                                  <button
                                      class="collection-games-editor__remove btn btn--small btn--danger-text"
                                      type="button"
                                      data-remove-game="${game.slug}"
                                      aria-label="${this.removedSlugs.has(game.slug) ? 'Undo removal of' : 'Remove'} ${game.title}"
                                  >
                                      <span aria-hidden="true">${unsafeHtml(deleteIcon)}</span>
                                      <span data-remove-label
                                          >${this.removedSlugs.has(game.slug) ? 'Undo' : 'Remove'}</span
                                      >
                                  </button>
                              </li>`,
                      )}
                  </ul>`.value;
        this.setDisabled(this.isDisabled);
    }

    public async reload(): Promise<void> {
        if (this.isDisposed) return;
        const requestId = ++this.requestId;
        if (this.errorBanner) this.release(this.errorBanner);
        this.errorBanner = undefined;
        this.body.setAttribute('aria-busy', 'true');
        this.body.innerHTML = html`
            <span class="sr-only">Loading games…</span>
            ${[1, 2].map(() => skeletonHtml('collection-games-editor__skeleton'))}
        `.value;
        try {
            const games = await this.loadGames();
            if (games === undefined || requestId !== this.requestId) return;
            this.games = games;
            const currentSlugs = new Set(games.map((game) => game.slug));
            for (const slug of this.removedSlugs) {
                if (!currentSlugs.has(slug)) this.removedSlugs.delete(slug);
            }
            this.renderGames();
            this.onChange();
        } catch {
            if (requestId !== this.requestId) return;
            this.errorBanner = this.adopt(
                new ErrorBanner({
                    message: 'The games could not be loaded. Please try again.',
                    onRetry: (): void => {
                        void this.reload();
                    },
                }),
            );
            this.body.replaceChildren(this.errorBanner.element);
            this.setDisabled(this.isDisabled);
        } finally {
            if (requestId === this.requestId) this.body.removeAttribute('aria-busy');
        }
    }

    public getRemovedSlugs(): readonly string[] {
        return [...this.removedSlugs];
    }

    public setDisabled(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        for (const button of this.body.querySelectorAll('button')) button.disabled = isDisabled;
    }

    public override destroy(): void {
        this.isDisposed = true;
        this.requestId += 1;
        super.destroy();
    }
}
