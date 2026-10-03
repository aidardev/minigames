import type { AuthTab } from '@/components/dialogs/auth-dialog/auth-dialog';
import type { NavigateOptions } from './router';

export const NAVIGATE_EVENT = 'app:navigate';

export interface NavigateEventDetail {
    to: string;
    options?: NavigateOptions;
}

export function isNavigateEvent(event: Event): event is CustomEvent<NavigateEventDetail> {
    return event.type === NAVIGATE_EVENT && event instanceof CustomEvent;
}

/**
Components ask for navigation by event, so they never need a reference to the router.
*/
export function navigate(to: string, options?: NavigateOptions): void {
    dispatchEvent(
        new CustomEvent<NavigateEventDetail>(NAVIGATE_EVENT, { detail: { to, options } }),
    );
}

/**
Sets one query param and keeps the rest.
*/
export function setQueryParameter(key: string, value: string, options?: NavigateOptions): void {
    const parameters = new URLSearchParams(location.search);
    parameters.set(key, value);

    navigate(`${location.pathname}?${parameters.toString()}`, options);
}

export function openGameDetails(slug: string): void {
    setQueryParameter('game', slug);
}

export function openAuth(tab: AuthTab): void {
    setQueryParameter('auth', tab);
}
