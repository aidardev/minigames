import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { getCategories } from './categories';

vi.mock('./api-client', () => ({ apiClient: vi.fn() }));

describe('getCategories', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('requests /categories with the signal and returns the data', async () => {
        const categories = [{ slug: 'puzzle' }, { slug: 'arcade' }];
        const { signal } = new AbortController();
        vi.mocked(apiClient).mockResolvedValue({ data: categories });

        await expect(getCategories(signal)).resolves.toBe(categories);

        expect(apiClient).toHaveBeenCalledExactlyOnceWith('/categories', { signal });
    });
});
