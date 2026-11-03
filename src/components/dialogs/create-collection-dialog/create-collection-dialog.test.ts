// @vitest-environment jsdom

import { showSnackbar } from '@/components/snackbar/snackbar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CreateCollectionDialog,
    type CreateCollectionDialogOptions,
} from './create-collection-dialog';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const dialogs: CreateCollectionDialog[] = [];

function setup() {
    const onCreate = vi.fn<CreateCollectionDialogOptions['onCreate']>().mockResolvedValue('new-id');
    const dialog = new CreateCollectionDialog({ onCreate });
    const close = vi.fn();
    Object.defineProperty(dialog.element, 'close', { value: close });
    dialogs.push(dialog);
    document.body.append(dialog.element);

    function query<E extends HTMLElement>(selector: string): E {
        const element = dialog.element.querySelector<E>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
    }

    function type(name: 'name' | 'description', value: string): void {
        const input = query<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const submit = (): SubmitEvent => {
        const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
        query<HTMLFormElement>('form').dispatchEvent(event);
        return event;
    };

    return { dialog, onCreate, close, query, type, submit };
}

describe('CreateCollectionDialog', () => {
    beforeEach(() => vi.clearAllMocks());

    afterEach(() => {
        for (const dialog of dialogs) dialog.destroy();
        dialogs.length = 0;
        document.body.replaceChildren();
    });

    it('starts without visible errors and requires a non-blank name', () => {
        const { type, query, onCreate, submit } = setup();
        const error = query<HTMLElement>('[data-field-error="name"]');
        const button = query<HTMLButtonElement>('[type="submit"]');
        expect(error.hidden).toBe(true);
        expect(button.disabled).toBe(true);

        type('name', ' '.repeat(3));
        expect(error.hidden).toBe(false);
        expect(query('[name="name"]').getAttribute('aria-invalid')).toBe('true');
        expect(submit().defaultPrevented).toBe(true);
        expect(onCreate).not.toHaveBeenCalled();

        type('name', 'Cozy games');
        expect(error.hidden).toBe(true);
        expect(query('[name="name"]').hasAttribute('aria-invalid')).toBe(false);
        expect(button.disabled).toBe(false);
        expect(query<HTMLElement>('[data-field-error="description"]').hidden).toBe(true);
    });

    it.each([
        ['name', 60],
        ['description', 300],
    ] as const)(
        'checks the %s length even for values assigned programmatically',
        (field, limit) => {
            const { type, query, submit, onCreate } = setup();
            type('name', 'Valid name');
            type(field, 'x'.repeat(limit + 1));
            submit();

            expect(onCreate).not.toHaveBeenCalled();
            expect(query<HTMLElement>(`[data-field-error="${field}"]`).hidden).toBe(false);
            type(field, 'x'.repeat(limit));
            expect(query<HTMLButtonElement>('[type="submit"]').disabled).toBe(false);
        },
    );

    it('reads current DOM values on submit and sends trimmed values', async () => {
        const { query, submit, onCreate, close } = setup();
        query<HTMLInputElement>('[name="name"]').value = '  Cozy games  ';
        query<HTMLTextAreaElement>('[name="description"]').value = '  After work  ';
        submit();

        expect(onCreate).toHaveBeenCalledExactlyOnceWith({
            name: 'Cozy games',
            description: 'After work',
        });
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith('Collection created.', 'success');
    });

    it('locks all controls, dismissal and duplicate submissions until the write finishes', async () => {
        const { dialog, query, type, submit, onCreate, close } = setup();
        const pending = Promise.withResolvers<string>();
        onCreate.mockReturnValue(pending.promise);
        type('name', 'Cozy games');
        submit();
        submit();

        for (const control of dialog.element.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement
        >('input, textarea, button')) {
            expect(control.disabled).toBe(true);
        }
        expect(query('[type="submit"]').textContent).toBe('Creating…');
        expect(query('form').getAttribute('aria-busy')).toBe('true');
        const cancel = new Event('cancel', { cancelable: true });
        dialog.element.dispatchEvent(cancel);
        expect(cancel.defaultPrevented).toBe(true);
        const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        dialog.element.dispatchEvent(escape);
        expect(escape.defaultPrevented).toBe(true);
        dialog.element.dispatchEvent(new MouseEvent('pointerdown'));
        dialog.element.dispatchEvent(new MouseEvent('click'));
        query<HTMLButtonElement>('[data-action="close"]').click();
        expect(close).not.toHaveBeenCalled();
        expect(onCreate).toHaveBeenCalledExactlyOnceWith({ name: 'Cozy games', description: '' });

        pending.resolve('saved');
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it('preserves the text on failure, shows a snackbar and allows retrying', async () => {
        const { type, submit, onCreate, query, close } = setup();
        onCreate.mockRejectedValueOnce(new Error('permission-denied'));
        type('name', '  My collection  ');
        type('description', 'My notes');
        submit();
        await vi.waitFor(() => expect(showSnackbar).toHaveBeenCalledOnce());

        expect(close).not.toHaveBeenCalled();
        expect(showSnackbar).toHaveBeenCalledWith(
            'Your collection could not be created. Please try again.',
            'error',
        );
        expect(query<HTMLInputElement>('[name="name"]').value).toBe('  My collection  ');
        expect(query<HTMLTextAreaElement>('[name="description"]').value).toBe('My notes');
        expect(query<HTMLButtonElement>('[type="submit"]').disabled).toBe(false);
        expect(query('[type="submit"]').textContent).toBe('Create collection');
        expect(query('form').getAttribute('aria-busy')).toBe('false');

        submit();
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(onCreate).toHaveBeenCalledTimes(2);
    });

    it.each(['resolve', 'reject'] as const)(
        'ignores a pending write that %ss after the dialog is destroyed',
        async (outcome) => {
            const { dialog, type, submit, onCreate, close } = setup();
            const pending = Promise.withResolvers<string>();
            onCreate.mockReturnValue(pending.promise);
            type('name', 'Cozy games');
            submit();
            dialog.destroy();

            if (outcome === 'resolve') pending.resolve('old-id');
            else pending.reject(new Error('Old error'));
            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            expect(showSnackbar).not.toHaveBeenCalled();
            expect(close).not.toHaveBeenCalled();
        },
    );

    it('ignores a successful write after programmatic navigation closes the dialog', async () => {
        const { dialog, type, submit, onCreate, close } = setup();
        const pending = Promise.withResolvers<string>();
        onCreate.mockReturnValue(pending.promise);
        type('name', 'Cozy games');
        submit();
        dialog.close();
        pending.resolve('old-id');
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        expect(close).toHaveBeenCalledOnce();
        expect(showSnackbar).not.toHaveBeenCalled();
    });
});
