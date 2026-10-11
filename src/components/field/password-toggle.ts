const TOGGLE_SELECTOR = '[data-password-toggle]';
const CONTROL_SELECTOR = '.field__control';

function findToggle(target: EventTarget | null): HTMLButtonElement | undefined {
    if (!(target instanceof Element)) return undefined;
    return target.closest<HTMLButtonElement>(TOGGLE_SELECTOR) ?? undefined;
}

function findInput(toggle: HTMLElement): HTMLInputElement | undefined {
    return toggle.closest(CONTROL_SELECTOR)?.querySelector<HTMLInputElement>('input') ?? undefined;
}

function setPasswordVisible(toggle: HTMLElement, isVisible: boolean): void {
    const input = findInput(toggle);
    if (!input) return;

    input.type = isVisible ? 'text' : 'password';
    // The label stays "Show password"; aria-pressed carries the state (also drives the icon CSS).
    toggle.setAttribute('aria-pressed', String(isVisible));
}

/**
 * Adds show/hide behavior to every [data-password-toggle] button inside root.
 * Uses event delegation, so a single listener covers all toggles.
 */
export function bindPasswordToggles(root: HTMLElement): void {
    // Keep focus in the input: otherwise the click blurs it, which triggers validation
    // and shows "required" for an empty password
    root.addEventListener('mousedown', (event: MouseEvent): void => {
        if (findToggle(event.target)) event.preventDefault();
    });

    root.addEventListener('click', (event: MouseEvent): void => {
        const toggle = findToggle(event.target);
        if (!toggle) return;

        const input = findInput(toggle);
        if (input) setPasswordVisible(toggle, input.type === 'password');
    });
}

// form.reset() does not restore input.type, so hide revealed passwords manually
export function resetPasswordToggles(root: HTMLElement): void {
    for (const toggle of root.querySelectorAll<HTMLElement>(TOGGLE_SELECTOR)) {
        setPasswordVisible(toggle, false);
    }
}
