import type { AuthTab } from '@/components/dialogs/auth-dialog/auth-dialog';
import type { NavigateOptions } from './router';

export const NAVIGATE_EVENT = 'app:navigate';

type AuthGuard = () => boolean;

const authGate: { isBlocked: AuthGuard } = {
    isBlocked: (): boolean => false,
};

export interface NavigateEventDetail {
    to: string;
    options?: NavigateOptions;
}

export function isNavigateEvent(event: Event): event is CustomEvent<NavigateEventDetail> {
    return event.type === NAVIGATE_EVENT && event instanceof CustomEvent;
}

/**
 * Components ask for navigation by event, so they never need a reference to the router.
 */
export function navigate(to: string, options?: NavigateOptions): void {
    dispatchEvent(
        new CustomEvent<NavigateEventDetail>(NAVIGATE_EVENT, { detail: { to, options } }),
    );
}

export function setQueryParameters(
    values: Record<string, string>,
    options?: NavigateOptions,
): void {
    const parameters = new URLSearchParams(location.search);

    for (const [key, value] of Object.entries(values)) {
        parameters.set(key, value);
    }

    navigate(`${location.pathname}?${parameters.toString()}`, options);
}

/**
 * Sets one query param and keeps the rest.
 */
export function setQueryParameter(key: string, value: string, options?: NavigateOptions): void {
    setQueryParameters({ [key]: value }, options);
}

export function openGameDetails(slug: string): void {
    setQueryParameter('game', slug);
}

export function openAuth(tab: AuthTab): void {
    // Blocked before navigating, so no history entry is created for a dialog that never opens.
    if (authGate.isBlocked()) return;

    setQueryParameter('auth', tab);
}

/**
 * Registers the check that stops Auth from opening (returns true when blocked).
 * Lets the navigation layer stay free of session and UI dependencies.
 */
export function setAuthGuard(isGuard: AuthGuard): void {
    authGate.isBlocked = isGuard;
}
