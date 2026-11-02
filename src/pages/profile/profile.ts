import { openAuth } from '@/app/navigation';
import { BaseComponent } from '@/components/base-component';
import { EmptyState } from '@/components/empty-state/empty-state';
import { PageTitle } from '@/components/page-title/page-title';
import { appSession } from '@/services/session/app-session';
import type { AppSession } from '@/services/session/session.types';
import { ProfileCollections } from './blocks/collections/profile-collections';
import { ProfileSummary } from './blocks/profile-summary/profile-summary';
import './profile.scss';

export class ProfilePage extends BaseComponent<'main'> {
    private readonly content = document.createElement('div');
    private readonly unsubscribeSession: () => void;
    private uid: string | undefined;
    private summary: ProfileSummary | undefined;
    private collections: BaseComponent | undefined;

    constructor() {
        super('main', 'profile-page');

        this.content.className = 'profile-page__content container';
        this.element.append(
            this.adopt(
                new PageTitle({
                    title: 'My profile',
                    subtitle: 'Your favorite worlds, all in one place.',
                }),
            ).element,
            this.content,
        );

        this.unsubscribeSession = appSession.subscribe((session): void =>
            this.renderSession(session),
        );
    }

    private renderSession(session: AppSession | undefined): void {
        if (session && session.uid === this.uid && this.summary) {
            this.summary.updateProfile(session);
            return;
        }

        // Tear down subscriptions and pending loads before showing another account.
        if (this.summary) this.release(this.summary);
        if (this.collections) this.release(this.collections);
        this.summary = undefined;
        this.collections = undefined;
        this.uid = session?.uid;
        this.content.replaceChildren();

        if (!session) {
            this.collections = this.adopt(
                new EmptyState({
                    title: 'Sign in to view your profile',
                    description: 'Your personal game collections will be waiting for you.',
                    action: { label: 'Sign in', onClick: (): void => openAuth('login') },
                }),
            );
            this.content.append(this.collections.element);
            return;
        }

        const summary = this.adopt(
            new ProfileSummary({
                profile: session,
                collectionsCount: 'loading',
                gamesCount: 'loading',
            }),
        );
        this.summary = summary;
        this.collections = this.adopt(
            new ProfileCollections({
                uid: session.uid,
                onStatisticsChange: (statistics): void => summary.updateStatistics(statistics),
            }),
        );
        this.content.append(summary.element, this.collections.element);
    }

    public override destroy(): void {
        this.unsubscribeSession();
        super.destroy();
    }
}
