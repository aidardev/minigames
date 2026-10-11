// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    AUTH_PARAM,
    GAME_PARAM,
    isNavigateEvent,
    navigate,
    NAVIGATE_EVENT,
    openAuth,
    openGameDetails,
    setAuthGuard,
    setQueryParameter,
    setQueryParameters,
    type NavigateEventDetail,
} from './navigation';

describe('navigation helpers', () => {
    const receivedEvents: Event[] = [];
    const listener = (event: Event): void => {
        receivedEvents.push(event);
    };

    beforeEach(() => {
        receivedEvents.length = 0;
        history.replaceState(undefined, '', '/library?existing=old&keep=value');
        addEventListener(NAVIGATE_EVENT, listener);
    });

    afterEach(() => {
        removeEventListener(NAVIGATE_EVENT, listener);
        setAuthGuard((): boolean => false);
    });

    it('allows Auth navigation before an auth guard is registered', () => {
        openAuth('login');

        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0] && isNavigateEvent(receivedEvents[0])).toBe(true);
    });

    it('recognizes only CustomEvents with the application navigation type', () => {
        const validEvent = new CustomEvent<NavigateEventDetail>(NAVIGATE_EVENT, {
            detail: { to: '/library' },
        });

        expect(isNavigateEvent(validEvent)).toBe(true);
        expect(isNavigateEvent(new Event(NAVIGATE_EVENT))).toBe(false);
        expect(isNavigateEvent(new CustomEvent('other:event'))).toBe(false);
    });

    it('dispatches navigation destinations together with options', () => {
        navigate('/library?page=2', { replace: true });

        expect(receivedEvents).toHaveLength(1);
        const event = receivedEvents[0];
        expect(event).toBeInstanceOf(CustomEvent);
        if (!event || !isNavigateEvent(event)) throw new Error('Expected an app navigation event');

        expect(event.detail).toEqual({ to: '/library?page=2', options: { replace: true } });
    });

    it('sets multiple query parameters while preserving others and forwards options', () => {
        setQueryParameters({ existing: 'new', added: 'yes' }, { replace: true });

        const event = receivedEvents[0];
        expect(event).toBeDefined();
        if (!event || !isNavigateEvent(event)) throw new Error('Expected an app navigation event');

        const destination = new URL(event.detail.to, location.origin);
        expect(destination.pathname).toBe('/library');
        expect(destination.searchParams.get('existing')).toBe('new');
        expect(destination.searchParams.get('keep')).toBe('value');
        expect(destination.searchParams.get('added')).toBe('yes');
        expect(event.detail.options).toEqual({ replace: true });
    });

    it('sets one query parameter without discarding the rest', () => {
        setQueryParameter('page', '3');

        const event = receivedEvents[0];
        expect(event && isNavigateEvent(event)).toBe(true);
        if (!event || !isNavigateEvent(event)) return;

        const destination = new URL(event.detail.to, location.origin);
        expect(destination.searchParams.get('page')).toBe('3');
        expect(destination.searchParams.get('existing')).toBe('old');
        expect(destination.searchParams.get('keep')).toBe('value');
    });

    it('opens Game Details through the game query parameter', () => {
        openGameDetails('cat-mail-co');

        const event = receivedEvents[0];
        expect(event && isNavigateEvent(event)).toBe(true);
        if (!event || !isNavigateEvent(event)) return;

        const destination = new URL(event.detail.to, location.origin);
        expect(destination.searchParams.get(GAME_PARAM)).toBe('cat-mail-co');
        expect(destination.searchParams.get('keep')).toBe('value');
    });

    it('opens Auth for a guest and preserves the active query parameters', () => {
        openAuth('register');

        const event = receivedEvents[0];
        expect(event && isNavigateEvent(event)).toBe(true);
        if (!event || !isNavigateEvent(event)) return;

        const destination = new URL(event.detail.to, location.origin);
        expect(destination.searchParams.get(AUTH_PARAM)).toBe('register');
        expect(destination.searchParams.get('keep')).toBe('value');
    });

    it('does not dispatch navigation when the auth guard blocks Auth', () => {
        setAuthGuard((): boolean => true);

        openAuth('login');

        expect(receivedEvents).toHaveLength(0);
    });
});
