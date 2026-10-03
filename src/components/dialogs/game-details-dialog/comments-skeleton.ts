import { BaseComponent } from '@/components/base-component';
import { skeletonHtml } from '@/components/skeleton/skeleton';
import { html, type SafeHtml } from '@/utils/html';

const SKELETON_COMMENT_COUNT = 3;

function renderSkeletonComment(): SafeHtml {
    return html`
        <li class="game-details__comment">
            <div class="comment">
                <div class="comment__header">
                    <div class="comment__author">
                        ${skeletonHtml('comment__skeleton comment__skeleton--avatar')}
                        ${skeletonHtml('comment__skeleton comment__skeleton--name')}
                    </div>
                </div>
                ${skeletonHtml('comment__skeleton')}
                ${skeletonHtml('comment__skeleton comment__skeleton--like')}
            </div>
        </li>
    `;
}

export class CommentsSkeleton extends BaseComponent<'div'> {
    constructor() {
        super('div', 'game-details__comments');
        this.element.setAttribute('aria-hidden', 'true');

        this.setHtml(html`
            ${skeletonHtml('game-details__skeleton-section-title')}
            <div class="game-details__comment-form comment-form">
                ${skeletonHtml('comment-form__skeleton-avatar')}
                ${skeletonHtml('comment-form__skeleton-input')}
            </div>
            <ul class="game-details__comments-list list-unstyled">
                ${Array.from({ length: SKELETON_COMMENT_COUNT }, (): SafeHtml => renderSkeletonComment())}
            </ul>
        `);
    }
}
