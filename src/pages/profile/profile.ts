import { BaseComponent } from '@/components/base-component';
import { PageTitle } from '@/components/page-title/page-title';
import { CollectionsSection } from './blocks/collections/collections';
import { ProfileSummary } from './blocks/profile-summary/profile-summary';
import { COLLECTIONS_PREVIEW, PROFILE_PREVIEW } from './profile-preview';
import './profile.scss';

export class ProfilePage extends BaseComponent<'main'> {
    constructor() {
        super('main', 'profile-page');

        const gamesCount = new Set(
            COLLECTIONS_PREVIEW.flatMap(({ games }) => games.map(({ slug }) => slug)),
        ).size;
        const content = document.createElement('div');
        content.className = 'profile-page__content container';
        content.append(
            this.adopt(
                new ProfileSummary({
                    profile: PROFILE_PREVIEW,
                    collectionsCount: COLLECTIONS_PREVIEW.length,
                    gamesCount,
                }),
            ).element,
            this.adopt(new CollectionsSection(COLLECTIONS_PREVIEW)).element,
        );

        this.element.append(
            this.adopt(
                new PageTitle({
                    title: 'My profile',
                    subtitle: 'Your favorite worlds, all in one place.',
                }),
            ).element,
            content,
        );
    }
}
