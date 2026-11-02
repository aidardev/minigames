import collectionsIcon from '@/assets/icons/collections.svg?raw';
import heartIcon from '@/assets/icons/favorite.svg?raw';
import mailIcon from '@/assets/icons/mail.svg?raw';
import { BaseComponent } from '@/components/base-component';
import { ProfileAvatar } from '@/components/profile-avatar/profile-avatar';
import { createSkeleton } from '@/components/skeleton/skeleton';
import type { AppSessionProfile } from '@/services/session/session.types';
import { html, unsafeHtml } from '@/utils/html';
import { getProfileView } from '@/utils/profile/profile';
import './profile-summary.scss';

type ProfileIdentity = Pick<AppSessionProfile, 'displayName' | 'email' | 'avatarUrl'>;
type StatisticValue = number | 'loading' | 'unavailable';

export interface ProfileStatistics {
    collectionsCount: StatisticValue;
    gamesCount: StatisticValue;
}

interface ProfileSummaryProperties extends ProfileStatistics {
    profile: ProfileIdentity;
}

export class ProfileSummary extends BaseComponent<'section'> {
    private readonly avatar = this.adopt(new ProfileAvatar());
    private readonly profileName: HTMLElement;
    private readonly email: HTMLElement;
    private readonly collectionsCount: HTMLElement;
    private readonly gamesCount: HTMLElement;

    constructor({ profile, collectionsCount, gamesCount }: ProfileSummaryProperties) {
        super('section', 'profile-summary');
        this.element.setAttribute('aria-labelledby', 'profile-name');

        this.avatar.element.classList.add('profile-summary__avatar');

        this.setHtml(html`
            <div class="profile-summary__body">
                <div class="profile-summary__identity">
                    <span data-profile-avatar></span>
                    <div class="profile-summary__details">
                        <h2 class="profile-summary__name" id="profile-name"></h2>
                        <p class="profile-summary__email">
                            <span aria-hidden="true">${unsafeHtml(mailIcon)}</span>
                            <span data-profile-email></span>
                        </p>
                    </div>
                </div>
                <dl class="profile-summary__stats">
                    <div class="profile-summary__stat">
                        <dt>
                            <span class="profile-summary__stat-icon" aria-hidden="true">
                                ${unsafeHtml(collectionsIcon)}
                            </span>
                            Collections
                        </dt>
                        <dd data-collections-count></dd>
                    </div>
                    <div class="profile-summary__stat">
                        <dt>
                            <span class="profile-summary__stat-icon" aria-hidden="true">
                                ${unsafeHtml(heartIcon)}
                            </span>
                            Games saved
                        </dt>
                        <dd data-games-count></dd>
                    </div>
                </dl>
            </div>
        `);

        this.profileName = this.getElement('#profile-name');
        this.email = this.getElement('[data-profile-email]');
        this.collectionsCount = this.getElement('[data-collections-count]');
        this.gamesCount = this.getElement('[data-games-count]');
        this.getElement('[data-profile-avatar]').replaceWith(this.avatar.element);
        this.updateProfile(profile);
        this.updateStatistics({ collectionsCount, gamesCount });
    }

    private renderCount(element: HTMLElement, value: StatisticValue): void {
        element.removeAttribute('aria-busy');
        element.removeAttribute('aria-label');

        if (value === 'loading') {
            element.setAttribute('aria-busy', 'true');
            element.setAttribute('aria-label', 'Loading');
            element.replaceChildren(createSkeleton('profile-summary__stat-placeholder'));
        } else {
            element.textContent = value === 'unavailable' ? '—' : String(value);
            if (value === 'unavailable') element.setAttribute('aria-label', 'Unavailable');
        }
    }

    public updateProfile(profile: ProfileIdentity): void {
        const { name, initials } = getProfileView(profile);
        this.profileName.textContent = name;
        this.email.textContent = profile.email;
        this.avatar.update({ avatarUrl: profile.avatarUrl, initials });
    }

    public updateStatistics({ collectionsCount, gamesCount }: ProfileStatistics): void {
        this.renderCount(this.collectionsCount, collectionsCount);
        this.renderCount(this.gamesCount, gamesCount);
    }
}
