// @vitest-environment jsdom

import { ApiError } from '@/api/api-error';
import { BaseComponent } from '@/components/base-component';
import { showSnackbar } from '@/components/snackbar/snackbar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncRegion, type AsyncRegionOptions } from './async-region';

vi.mock('@/components/snackbar/snackbar', () => ({ showSnackbar: vi.fn() }));

function content(text: string): HTMLElement {
    const element = document.createElement('p');
    element.textContent = text;
    return element;
}

class TestContent extends BaseComponent<'div'> {
    public readonly onDestroy = vi.fn();

    constructor(text: string) {
        super('div');
        this.element.textContent = text;
    }

    public override destroy(): void {
        this.onDestroy();
        super.destroy();
    }
}

describe('AsyncRegion', () => {
    const regions: AsyncRegion<string[]>[] = [];

    function setup(overrides: Partial<AsyncRegionOptions<string[]>> = {}) {
        const load = vi
            .fn<(signal: AbortSignal) => Promise<string[]>>()
            .mockResolvedValue(['Game']);
        const renderSuccess = vi.fn((data: string[]) => content(data.join(', ')));
        const region = new AsyncRegion<string[]>(
            {
                load,
                renderSkeleton: () => content('Loading'),
                renderSuccess,
                ...overrides,
            },
            'games',
        );
        regions.push(region);
        document.body.append(region.element);
        return { region, element: region.element, load, renderSuccess };
    }

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        for (const region of regions) region.destroy();
        regions.length = 0;
        vi.restoreAllMocks();
    });

    it('shows a busy skeleton until data arrives, then renders success', async () => {
        const request = Promise.withResolvers<string[]>();
        const { region, element, load, renderSuccess } = setup();
        load.mockReturnValue(request.promise);
        const loading = region.load();
        expect(element.classList.contains('games')).toBe(true);
        expect(element.textContent).toBe('Loading');
        expect(element.getAttribute('aria-busy')).toBe('true');
        expect(load).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
        expect(renderSuccess).not.toHaveBeenCalled();

        request.resolve(['Cat', 'Puzzle']);
        await loading;
        expect(renderSuccess).toHaveBeenCalledExactlyOnceWith(['Cat', 'Puzzle']);
        expect(element.textContent).toBe('Cat, Puzzle');
        expect(element.hasAttribute('aria-busy')).toBe(false);
    });

    it('renders the default empty state for an empty array', async () => {
        const { region, element, load, renderSuccess } = setup();
        load.mockResolvedValue([]);
        await region.load();
        expect(element.textContent).toContain('Nothing here yet');
        expect(element.hasAttribute('aria-busy')).toBe(false);
        expect(renderSuccess).not.toHaveBeenCalled();
    });

    it('uses a custom emptiness check and empty view', async () => {
        const isEmpty = vi.fn((data: string[]) => data.includes('unavailable'));
        const empty = content('No available games');
        const { region, element, load, renderSuccess } = setup({
            isEmpty,
            renderEmpty: () => empty,
        });
        load.mockResolvedValue(['unavailable']);
        await region.load();
        expect(isEmpty).toHaveBeenCalledExactlyOnceWith(['unavailable']);
        expect(element.firstElementChild).toBe(empty);
        expect(renderSuccess).not.toHaveBeenCalled();
    });

    it('renders non-array data as success by default', async () => {
        const region = new AsyncRegion({
            load: async () => ({ total: 0 }),
            renderSkeleton: () => content('Loading'),
            renderSuccess: (data) => content(`Total: ${data.total}`),
        });
        await region.load();
        expect(region.element.textContent).toBe('Total: 0');
        region.destroy();
    });

    it.each([
        [new ApiError('Service unavailable', 503), 'Service unavailable'],
        [new Error('offline'), 'Something went wrong. Please try again.'],
    ])('shows an error and retries only after a click: %s', async (error, message) => {
        const { region, element, load } = setup();
        load.mockRejectedValueOnce(error).mockResolvedValueOnce(['Recovered']);
        await region.load();
        expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
        expect(element.hasAttribute('aria-busy')).toBe(false);
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith(message, 'error');
        expect(load).toHaveBeenCalledOnce();

        const retry = element.querySelector<HTMLButtonElement>('.error-banner__retry');
        if (!retry) throw new Error('Missing retry button');
        retry.click();
        await vi.waitFor(() => expect(element.textContent).toBe('Recovered'));
        expect(load).toHaveBeenCalledTimes(2);
        expect(element.hasAttribute('aria-busy')).toBe(false);
    });

    it('uses a custom error view with a working retry callback and no snackbar', async () => {
        const error = new ApiError('Invalid filters', 400);
        const renderError = vi.fn((_error: unknown, retry: () => void) => {
            const button = document.createElement('button');
            button.textContent = 'Reset filters';
            button.addEventListener('click', retry);
            return button;
        });
        const { region, element, load } = setup({ renderError });
        load.mockRejectedValueOnce(error).mockResolvedValueOnce(['Recovered']);
        await region.load();
        expect(renderError).toHaveBeenCalledExactlyOnceWith(error, expect.any(Function));
        expect(element.textContent).toBe('Reset filters');
        expect(element.hasAttribute('aria-busy')).toBe(false);
        expect(showSnackbar).not.toHaveBeenCalled();
        element.querySelector('button')?.click();
        await vi.waitFor(() => expect(element.textContent).toBe('Recovered'));
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('falls back to the error banner when custom error rendering returns undefined', async () => {
        const renderError = vi.fn<() => undefined>();
        const { region, element, load } = setup({ renderError });
        const error = new ApiError('Not found', 404);
        load.mockRejectedValue(error);
        await region.load();
        expect(renderError).toHaveBeenCalledExactlyOnceWith(error, expect.any(Function));
        expect(element.querySelector('[role="alert"]')?.textContent).toContain('Not found');
        expect(showSnackbar).toHaveBeenCalledExactlyOnceWith('Not found', 'error');
    });

    it.each(['resolve', 'reject'] as const)(
        'aborts an old request and ignores its late %s',
        async (outcome) => {
            const oldRequest = Promise.withResolvers<string[]>();
            const newRequest = Promise.withResolvers<string[]>();
            const { region, element, load, renderSuccess } = setup();
            load.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
            const oldLoading = region.load();
            const oldSignal = load.mock.calls[0]?.[0];
            const newLoading = region.load();
            expect(oldSignal?.aborted).toBe(true);
            expect(load.mock.calls[1]?.[0].aborted).toBe(false);
            newRequest.resolve(['New']);
            await newLoading;

            if (outcome === 'resolve') oldRequest.resolve(['Old']);
            else oldRequest.reject(new Error('Stale failure'));
            await oldLoading;
            expect(element.textContent).toBe('New');
            expect(renderSuccess).toHaveBeenCalledExactlyOnceWith(['New']);
            expect(showSnackbar).not.toHaveBeenCalled();
            expect(element.hasAttribute('aria-busy')).toBe(false);
        },
    );

    it('destroys replaced components and the current component on destroy', async () => {
        const skeleton = new TestContent('Loading');
        const success = new TestContent('Success');
        const { region, element } = setup({
            renderSkeleton: () => skeleton,
            renderSuccess: () => success,
        });
        await region.load();
        expect(skeleton.onDestroy).toHaveBeenCalledOnce();
        expect(element.firstElementChild).toBe(success.element);
        expect(success.onDestroy).not.toHaveBeenCalled();
        region.destroy();
        expect(success.onDestroy).toHaveBeenCalledOnce();
        expect(element.isConnected).toBe(false);
        regions.splice(regions.indexOf(region), 1);
    });

    it.each(['resolve', 'reject'] as const)(
        'aborts on destroy and ignores a subsequent %s',
        async (outcome) => {
            const request = Promise.withResolvers<string[]>();
            const { region, element, load, renderSuccess } = setup();
            load.mockReturnValue(request.promise);
            const loading = region.load();
            const signal = load.mock.calls[0]?.[0];
            region.destroy();
            expect(signal?.aborted).toBe(true);
            expect(element.isConnected).toBe(false);
            if (outcome === 'resolve') request.resolve(['Late']);
            else request.reject(new Error('Late failure'));
            await loading;
            expect(renderSuccess).not.toHaveBeenCalled();
            expect(showSnackbar).not.toHaveBeenCalled();
            expect(element.textContent).toBe('Loading');
        },
    );
});
