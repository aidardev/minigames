import type { AuthTab } from '@/components/dialogs/auth-dialog/auth-dialog';
import type { NavigateOptions } from './router';

export const NAVIGATE_EVENT = 'app:navigate';
export const GAME_PARAM = 'game';
export const COLLECTION_PICKER_PARAM = 'collectionPicker';
export const AUTH_PARAM = 'auth';
export const CREATE_COLLECTION_PARAM = 'createCollection';
export const EDIT_COLLECTION_PARAM = 'editCollection';

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
    const parameters = new URLSearchParams(location.search);
    parameters.delete(COLLECTION_PICKER_PARAM);
    parameters.set(GAME_PARAM, slug);
    navigate(`${location.pathname}?${parameters.toString()}`);
}

export function setCollectionPickerOpen(isOpen: boolean): void {
    const parameters = new URLSearchParams(location.search);
    if (isOpen) parameters.set(COLLECTION_PICKER_PARAM, 'true');
    else parameters.delete(COLLECTION_PICKER_PARAM);
    navigate(`${location.pathname}?${parameters.toString()}`);
}

export function openCreateCollection(): void {
    const parameters = new URLSearchParams(location.search);
    parameters.delete(EDIT_COLLECTION_PARAM);
    parameters.set(CREATE_COLLECTION_PARAM, 'true');
    navigate(`${location.pathname}?${parameters.toString()}`);
}

export function openEditCollection(id: string): void {
    const parameters = new URLSearchParams(location.search);
    parameters.delete(CREATE_COLLECTION_PARAM);
    parameters.set(EDIT_COLLECTION_PARAM, id);
    navigate(`${location.pathname}?${parameters.toString()}`);
}

export function openAuth(tab: AuthTab): void {
    // Blocked before navigating, so no history entry is created for a dialog that never opens.
    if (authGate.isBlocked()) return;

    setQueryParameter(AUTH_PARAM, tab);
}

/**
 * Registers the check that stops Auth from opening (returns true when blocked).
 * Lets the navigation layer stay free of session and UI dependencies.
 */
export function setAuthGuard(isGuard: AuthGuard): void {
    authGate.isBlocked = isGuard;
}
