import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { ApiError } from './api-error';

vi.mock('@/config/environment', () => ({ API_BASE_URL: 'https://api.test' }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
    return Response.json(body, { status });
}

function lastRequestInit(): RequestInit {
    return fetchMock.mock.calls[0]?.[1] ?? {};
}

function lastRequestUrl(): string {
    return String(fetchMock.mock.calls[0]?.[0]);
}

describe('apiClient', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('request', () => {
        it('sends a GET to the base URL + endpoint without a body', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/games');

            expect(lastRequestUrl()).toBe('https://api.test/games');
            expect(lastRequestInit().method).toBe('GET');
            expect(lastRequestInit()).not.toHaveProperty('body');
            expect(lastRequestInit()).not.toHaveProperty('headers');
        });

        it('adds query params and converts numbers and booleans to strings', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/games', { query: { category: 'puzzle', page: 2, featured: true } });

            expect(lastRequestUrl()).toBe(
                'https://api.test/games?category=puzzle&page=2&featured=true',
            );
        });

        it('skips undefined query values', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/games', { query: { category: undefined, page: 1 } });

            expect(lastRequestUrl()).toBe('https://api.test/games?page=1');
        });

        it('encodes special characters in query values', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/games', { query: { userEmail: 'a b&c@d.e' } });

            expect(lastRequestUrl()).toBe('https://api.test/games?userEmail=a+b%26c%40d.e');
        });

        it('sends a POST body as JSON with a Content-Type header', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/comments', { method: 'POST', body: { text: 'Hi' } });

            expect(lastRequestInit().method).toBe('POST');
            expect(lastRequestInit().headers).toStrictEqual({ 'Content-Type': 'application/json' });
            expect(lastRequestInit().body).toBe('{"text":"Hi"}');
        });

        it('always gives fetch a signal, so the request has a timeout', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));

            await apiClient('/games');

            expect(lastRequestInit().signal).toBeInstanceOf(AbortSignal);
            expect(lastRequestInit().signal?.aborted).toBe(false);
        });

        it('aborts the fetch signal when the caller aborts', async () => {
            fetchMock.mockResolvedValue(jsonResponse({}));
            const controller = new AbortController();

            await apiClient('/games', { signal: controller.signal });
            controller.abort();

            expect(lastRequestInit().signal?.aborted).toBe(true);
        });
    });

    describe('success', () => {
        it('returns the parsed JSON body', async () => {
            fetchMock.mockResolvedValue(jsonResponse({ data: [1, 2, 3] }));

            await expect(apiClient('/games')).resolves.toStrictEqual({ data: [1, 2, 3] });
        });

        it('throws an ApiError when a successful response is not valid JSON', async () => {
            fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }));

            let error: unknown;
            try {
                await apiClient('/games');
            } catch (error_: unknown) {
                error = error_;
            }

            expect(error).toBeInstanceOf(ApiError);
            expect(error).toMatchObject({ message: 'The server returned an invalid response.' });
        });
    });

    describe('HTTP errors', () => {
        it('uses the error message from the server and keeps the status', async () => {
            fetchMock.mockResolvedValue(jsonResponse({ error: 'Game not found' }, 404));

            let error: unknown;
            try {
                await apiClient('/games/x');
            } catch (error_: unknown) {
                error = error_;
            }

            expect(error).toBeInstanceOf(ApiError);
            expect(error).toMatchObject({ message: 'Game not found', status: 404 });
        });

        it('falls back to a status message when the error body is not JSON', async () => {
            fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

            let error: unknown;
            try {
                await apiClient('/games');
            } catch (error_: unknown) {
                error = error_;
            }

            expect(error).toMatchObject({
                message: 'Request failed with status 502',
                status: 502,
            });
        });

        it.each([
            ['an object without "error"', '{"message":"nope"}'],
            ['an "error" that is not a string', '{"error":42}'],
            ['null', 'null'],
            ['a plain string', '"nope"'],
        ])('falls back to a status message when the error body is %s', async (_case, raw) => {
            fetchMock.mockResolvedValue(new Response(raw, { status: 500 }));

            await expect(apiClient('/games')).rejects.toMatchObject({
                message: 'Request failed with status 500',
                status: 500,
            });
        });
    });

    describe('network failures', () => {
        it('turns a failed fetch into a readable network error', async () => {
            fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

            let error: unknown;
            try {
                await apiClient('/games');
            } catch (error_: unknown) {
                error = error_;
            }

            expect(error).toBeInstanceOf(ApiError);
            expect(error).toMatchObject({
                message: 'Network error. Check your connection and try again.',
                status: undefined,
            });
        });

        it('turns a timeout into a "took too long" error', async () => {
            fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

            await expect(apiClient('/games')).rejects.toMatchObject({
                message: 'The server took too long to respond. Please try again.',
            });
        });

        it('returns the original error untouched when the caller cancelled', async () => {
            const abortError = new DOMException('aborted', 'AbortError');
            const controller = new AbortController();
            controller.abort();
            fetchMock.mockRejectedValue(abortError);

            await expect(apiClient('/games', { signal: controller.signal })).rejects.toBe(
                abortError,
            );
        });
    });
});
