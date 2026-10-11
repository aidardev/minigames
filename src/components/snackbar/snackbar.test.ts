// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bringSnackbarsToFront, showSnackbar } from './snackbar';

function notifications(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('.snackbar')];
}

function close(element: HTMLElement): void {
    const button = element.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('Missing notification close button');
    button.click();
}

describe('Snackbar', () => {
    const methodNames = ['showPopover', 'hidePopover', 'getAnimations'] as const;
    const originalDescriptors = methodNames.map((name) =>
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
    );
    let openPopovers: WeakSet<HTMLElement>;
    let showPopover: ReturnType<typeof vi.fn>;
    let hidePopover: ReturnType<typeof vi.fn>;
    let getAnimations: ReturnType<typeof vi.fn<() => { finished: Promise<unknown> }[]>>;

    beforeEach(() => {
        vi.useFakeTimers();
        openPopovers = new WeakSet();
        showPopover = vi.fn(function (this: HTMLElement) {
            openPopovers.add(this);
        });
        hidePopover = vi.fn(function (this: HTMLElement) {
            openPopovers.delete(this);
        });
        getAnimations = vi.fn<() => { finished: Promise<unknown> }[]>().mockReturnValue([]);
        // jsdom has no top layer or animation engine; model only these browser boundaries.
        for (const [name, value] of [
            ['showPopover', showPopover],
            ['hidePopover', hidePopover],
            ['getAnimations', getAnimations],
        ] as const) {
            Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value });
        }
        const matches = Element.prototype.matches;
        vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
            this: Element,
            selector: string,
        ) {
            return selector === ':popover-open'
                ? this instanceof HTMLElement && openPopovers.has(this)
                : matches.call(this, selector);
        });
    });

    afterEach(async () => {
        getAnimations.mockReturnValue([]);
        for (const notification of notifications()) close(notification);
        await vi.runAllTimersAsync();
        document.querySelector('.snackbar-container')?.remove();
        vi.restoreAllMocks();
        for (const [index, name] of methodNames.entries()) {
            const descriptor = originalDescriptors[index];
            if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
            else Reflect.deleteProperty(HTMLElement.prototype, name);
        }
        vi.useRealTimers();
    });

    it('creates one manual popover container and renders message text safely', () => {
        showSnackbar('<img src=x onerror=alert(1)>');
        showSnackbar('Saved', 'success');
        const container = document.querySelector<HTMLElement>('.snackbar-container');
        expect(document.querySelectorAll('.snackbar-container')).toHaveLength(1);
        expect(container?.popover).toBe('manual');
        expect(showPopover).toHaveBeenCalledOnce();
        expect(notifications()[0]?.querySelector('.snackbar__message')?.textContent).toBe(
            '<img src=x onerror=alert(1)>',
        );
        expect(notifications()[0]?.querySelector('img')).toBeNull();
        expect(notifications()[0]?.classList.contains('snackbar--info')).toBe(true);
        expect(notifications()[1]?.classList.contains('snackbar--success')).toBe(true);
    });

    it.each(['success', 'warning', 'info', 'error'] as const)(
        'sets the variant and accessible role for %s',
        (variant) => {
            showSnackbar('Message', variant);
            expect(notifications()[0]?.classList.contains(`snackbar--${variant}`)).toBe(true);
            expect(notifications()[0]?.getAttribute('role')).toBe(
                variant === 'error' ? 'alert' : 'status',
            );
            expect(notifications()[0]?.querySelector('button')?.getAttribute('aria-label')).toBe(
                'Close notification',
            );
        },
    );

    it('deduplicates by message and variant but allows the same text in another variant', () => {
        showSnackbar('Message', 'error');
        showSnackbar('Message', 'error');
        showSnackbar('Message', 'info');
        expect(notifications()).toHaveLength(2);
    });

    it('auto-dismisses after five seconds and allows the message to be shown again', async () => {
        showSnackbar('Message');
        await vi.advanceTimersByTimeAsync(4999);
        expect(notifications()).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(notifications()).toHaveLength(0);
        showSnackbar('Message');
        expect(notifications()).toHaveLength(1);
    });

    it('waits for animations before removal and ignores repeated close clicks', async () => {
        const animation = Promise.withResolvers<void>();
        getAnimations.mockReturnValue([{ finished: animation.promise }]);
        showSnackbar('Message');
        const notification = notifications()[0];
        if (!notification) throw new Error('Missing notification');
        close(notification);
        close(notification);
        expect(notification.classList.contains('snackbar--leaving')).toBe(true);
        expect(notification.isConnected).toBe(true);
        expect(getAnimations).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
        animation.resolve();
        await vi.advanceTimersByTimeAsync(0);
        expect(notification.isConnected).toBe(false);
        showSnackbar('Message');
        expect(notifications()).toHaveLength(1);
    });

    it('removes the notification even when an animation rejects', async () => {
        const animation = Promise.withResolvers<void>();
        getAnimations.mockReturnValue([{ finished: animation.promise }]);
        showSnackbar('Message');
        const notification = notifications()[0];
        if (!notification) throw new Error('Missing notification');
        close(notification);
        animation.reject(new Error('Animation cancelled'));
        await vi.advanceTimersByTimeAsync(0);
        expect(notifications()).toHaveLength(0);
        showSnackbar('Message');
        expect(notifications()).toHaveLength(1);
    });

    it('dismisses the oldest notification when a fourth is added', async () => {
        for (const message of ['First', 'Second', 'Third', 'Fourth']) showSnackbar(message);
        await vi.advanceTimersByTimeAsync(0);
        expect(
            notifications().map((item) => item.querySelector('.snackbar__message')?.textContent),
        ).toEqual(['Second', 'Third', 'Fourth']);
    });

    it('brings an open container to the front by hiding and showing it', () => {
        showSnackbar('Message');
        showPopover.mockClear();
        bringSnackbarsToFront();
        expect(hidePopover).toHaveBeenCalledOnce();
        expect(showPopover).toHaveBeenCalledOnce();
        expect(hidePopover.mock.invocationCallOrder[0]).toBeLessThan(
            showPopover.mock.invocationCallOrder[0] ?? 0,
        );
        expect(notifications()).toHaveLength(1);
    });

    it('does nothing when the container is missing or closed, and reopens it for a new message', () => {
        bringSnackbarsToFront();
        expect(showPopover).not.toHaveBeenCalled();
        showSnackbar('First');
        const container = document.querySelector<HTMLElement>('.snackbar-container');
        if (!container) throw new Error('Missing snackbar container');
        openPopovers.delete(container);
        showPopover.mockClear();
        bringSnackbarsToFront();
        expect(showPopover).not.toHaveBeenCalled();
        expect(hidePopover).not.toHaveBeenCalled();
        showSnackbar('Second');
        expect(showPopover).toHaveBeenCalledOnce();
    });
});
