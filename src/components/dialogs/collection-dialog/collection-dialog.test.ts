// @vitest-environment jsdom

import { showSnackbar } from '@/components/snackbar/snackbar';
import type { CollectionInput, CollectionItem } from '@/types/collection.types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../dialog';
import { CollectionDialog, type CollectionDialogOptions } from './collection-dialog';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

const dialogs: CollectionDialog[] = [];

function confirmation(): HTMLDialogElement {
    const element = document.querySelector<HTMLDialogElement>(
        'dialog[open]:has(.delete-collection)',
    );
    if (!element) throw new Error('Missing confirmation dialog');
    return element;
}

function confirmationButton(selector: string): HTMLButtonElement {
    const button = confirmation().querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Missing confirmation button: ${selector}`);
    return button;
}

function setup(initialValues?: Readonly<CollectionInput>, games: readonly CollectionItem[] = []) {
    const onSave = vi.fn<CollectionDialogOptions['onSave']>().mockResolvedValue('saved-id');
    const onDelete = vi.fn<() => Promise<string | undefined>>().mockResolvedValue('saved-id');
    const dialog = new CollectionDialog(
        initialValues
            ? { mode: 'edit', initialValues, onSave, loadGames: async () => games, onDelete }
            : { mode: 'create', onSave },
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
        onDelete,
        query,
        close,
        input,
        type,
        submit,
        button: query<HTMLButtonElement>('[type="submit"]'),
    };
}

describe('CollectionDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Dialog.prototype, 'open').mockImplementation(function (this: Dialog): void {
            document.body.append(this.element);
            this.element.open = true;
            Object.defineProperties(this.element, {
                getAnimations: { value: () => [] },
                close: {
                    value: (returnValue?: string): void => {
                        if (returnValue !== undefined) this.element.returnValue = returnValue;
                        this.element.open = false;
                        this.element.dispatchEvent(new Event('close'));
                    },
                },
            });
        });
    });

    afterEach(() => {
        for (const dialog of dialogs) dialog.destroy();
        dialogs.length = 0;
        document.body.replaceChildren();
        vi.restoreAllMocks();
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

        expect(onSave).toHaveBeenCalledExactlyOnceWith(
            {
                name: initial.name,
                description: 'New notes',
            },
            [],
        );
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

    it('stages removals with Undo and retains them and the form draft after a failed save', async () => {
        const initial = { name: 'Cozy games', description: 'After work' };
        const game: CollectionItem = {
            slug: 'sudoku',
            title: 'Sudoku',
            image: '/sudoku.jpg',
            addedAt: new Date(),
        };
        const { query, button, type, submit, onSave, input, close } = setup(initial, [game]);
        await vi.waitFor(() => expect(query('[data-remove-game]').textContent).toContain('Remove'));
        const removeButton = query('[data-remove-game]');
        const icon = removeButton.querySelector('svg');
        removeButton.click();
        expect(query('[data-remove-game]')).toBe(removeButton);
        expect(removeButton.querySelector('svg')).toBe(icon);
        expect(removeButton.classList.contains('btn--danger-text')).toBe(true);
        expect(button.disabled).toBe(false);
        expect(onSave).not.toHaveBeenCalled();
        query('[data-remove-game]').click();
        expect(button.disabled).toBe(true);
        query('[data-remove-game]').click();
        type('description', 'My draft');
        onSave.mockRejectedValueOnce(new Error('Offline'));
        submit();
        await vi.waitFor(() => expect(button.disabled).toBe(false));
        expect(input('description').value).toBe('My draft');
        expect(query('[data-remove-game]').textContent).toContain('Undo');
        expect(close).not.toHaveBeenCalled();
        submit();
        expect(onSave).toHaveBeenLastCalledWith({ name: initial.name, description: 'My draft' }, [
            'sudoku',
        ]);
        await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    });

    it('requires confirmation to delete and preserves the draft when deletion fails', async () => {
        const { query, type, input, submit, onSave, onDelete, close, dialog } = setup({
            name: 'Cozy games',
            description: '',
        });
        type('description', 'Keep this draft');
        query('[data-action="ask-delete"]').click();
        expect(onDelete).not.toHaveBeenCalled();
        expect(confirmation()).not.toBe(dialog.element);
        confirmationButton('[autofocus]').click();
        expect(input('description').value).toBe('Keep this draft');
        query('[data-action="ask-delete"]').click();
        const pending = Promise.withResolvers<string>();
        onDelete.mockReturnValueOnce(pending.promise);
        confirmationButton('[data-action="delete"]').click();
        submit();
        expect(onSave).not.toHaveBeenCalled();
        expect(onDelete).toHaveBeenCalledOnce();
        expect(query<HTMLFormElement>('form').inert).toBe(true);
        expect(confirmation().querySelectorAll('button:enabled')).toHaveLength(0);
        pending.reject(new Error('Offline'));
        await vi.waitFor(() =>
            expect(confirmationButton('[data-action="delete"]').disabled).toBe(false),
        );
        expect(close).not.toHaveBeenCalled();
        expect(input('description').value).toBe('Keep this draft');
        confirmationButton('[data-action="delete"]').click();
        await vi.waitFor(() => expect(close).toHaveBeenCalledWith('deleted'));
        expect(showSnackbar).toHaveBeenCalledWith('Collection deleted.', 'success');
    });

    it('closes a pending confirmation with its editor and ignores a late deletion result', async () => {
        const { dialog, query, onDelete, close } = setup({ name: 'Cozy games', description: '' });
        const pending = Promise.withResolvers<string>();
        onDelete.mockReturnValueOnce(pending.promise);
        query('[data-action="ask-delete"]').click();
        const child = confirmation();
        confirmationButton('[data-action="delete"]').click();
        dialog.close();
        expect(child.open).toBe(false);
        pending.resolve('deleted-id');
        await pending.promise;
        expect(close).toHaveBeenCalledOnce();
        expect(close).not.toHaveBeenCalledWith('deleted');
        expect(showSnackbar).not.toHaveBeenCalled();
    });
});
