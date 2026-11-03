// @vitest-environment jsdom

import { showSnackbar } from '@/components/snackbar/snackbar';
import type { CollectionInput } from '@/types/collection.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionDialog, type CollectionDialogOptions } from './collection-dialog';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const dialogs: CollectionDialog[] = [];

function setup(initialValues?: Readonly<CollectionInput>) {
    const onSave = vi.fn<CollectionDialogOptions['onSave']>().mockResolvedValue('saved-id');
    const dialog = new CollectionDialog(
        initialValues ? { mode: 'edit', initialValues, onSave } : { mode: 'create', onSave },
    );
    const close = vi.fn();
    Object.defineProperty(dialog.element, 'close', { value: close });
    dialogs.push(dialog);
    document.body.append(dialog.element);

    function query<E extends HTMLElement>(selector: string): E {
        const element = dialog.element.querySelector<E>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
    }

    const input = (name: keyof CollectionInput): HTMLInputElement | HTMLTextAreaElement =>
        query(`[name="${name}"]`);

    function type(name: keyof CollectionInput, value: string): void {
        input(name).value = value;
        input(name).dispatchEvent(new Event('input', { bubbles: true }));
    }

    function submit(): void {
        query<HTMLFormElement>('form').dispatchEvent(
            new SubmitEvent('submit', { bubbles: true, cancelable: true }),
        );
    }

    return {
        dialog,
        onSave,
        close,
        input,
        type,
        submit,
        button: query<HTMLButtonElement>('[type="submit"]'),
    };
}

describe('CollectionDialog', () => {
    beforeEach(() => vi.clearAllMocks());

    afterEach(() => {
        for (const dialog of dialogs) dialog.destroy();
        dialogs.length = 0;
        document.body.replaceChildren();
    });

    it('rejects blank names and values exceeding the field limits', () => {
        const { dialog, type, submit, onSave, button } = setup();
        expect(button.disabled).toBe(true);
        expect(dialog.element.querySelector('[aria-invalid="true"]')).toBeNull();

        for (const values of [
            { name: ' '.repeat(3), description: '' },
            { name: 'x'.repeat(61), description: '' },
            { name: 'Valid name', description: 'x'.repeat(301) },
        ]) {
            type('name', values.name);
            type('description', values.description);
            submit();
            expect(button.disabled).toBe(true);
            expect(onSave).not.toHaveBeenCalled();
            expect(dialog.element.querySelector('[aria-invalid="true"]')).not.toBeNull();
        }
    });

    it('creates a collection with trimmed values and closes on success', async () => {
        const { input, submit, onSave, close } = setup();
        input('name').value = '  Cozy games  ';
        input('description').value = '  After work  ';
        submit();

        expect(onSave).toHaveBeenCalledExactlyOnceWith({
            name: 'Cozy games',
            description: 'After work',
        });
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(showSnackbar).toHaveBeenCalledWith('Collection created.', 'success');
    });

    it('prefills editing fields and saves only changed values', async () => {
        const initial = { name: 'Cozy games', description: 'After work' };
        const { input, type, submit, onSave, button, close } = setup(initial);
        expect(input('name').value).toBe(initial.name);
        expect(input('description').value).toBe(initial.description);
        expect(button.disabled).toBe(true);
        submit();
        expect(onSave).not.toHaveBeenCalled();

        type('description', 'New notes');
        expect(button.disabled).toBe(false);
        submit();

        expect(onSave).toHaveBeenCalledExactlyOnceWith({
            name: initial.name,
            description: 'New notes',
        });
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(showSnackbar).toHaveBeenCalledWith('Collection updated.', 'success');
    });

    it('locks the form and prevents duplicate submissions while saving', async () => {
        const { dialog, type, submit, onSave, close } = setup();
        const pending = Promise.withResolvers<string>();
        onSave.mockReturnValueOnce(pending.promise);
        type('name', 'Cozy games');
        submit();
        submit();

        expect(onSave).toHaveBeenCalledOnce();
        expect(
            dialog.element.querySelectorAll('input:enabled, textarea:enabled, button:enabled'),
        ).toHaveLength(0);
        const cancel = new Event('cancel', { cancelable: true });
        dialog.element.dispatchEvent(cancel);
        expect(cancel.defaultPrevented).toBe(true);

        pending.resolve('saved-id');
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it('keeps the draft after failure and allows retrying', async () => {
        const { input, type, submit, onSave, button, close } = setup();
        onSave.mockRejectedValueOnce(new Error('Offline'));
        type('name', 'Cozy games');
        type('description', 'My notes');
        submit();
        await vi.waitFor(() => expect(button.disabled).toBe(false));

        expect(close).not.toHaveBeenCalled();
        expect(input('name').value).toBe('Cozy games');
        expect(input('description').value).toBe('My notes');
        expect(showSnackbar).toHaveBeenCalledWith(expect.any(String), 'error');

        submit();
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
        expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('ignores a save completed after the dialog is destroyed', async () => {
        const { dialog, type, submit, onSave, close } = setup();
        const pending = Promise.withResolvers<string>();
        onSave.mockReturnValueOnce(pending.promise);
        type('name', 'Cozy games');
        submit();
        dialog.destroy();
        pending.resolve('old-id');
        await pending.promise;

        expect(close).not.toHaveBeenCalled();
        expect(showSnackbar).not.toHaveBeenCalled();
    });
});
