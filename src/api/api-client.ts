import { API_BASE_URL } from '@/config/environment';
import { ApiError, type ApiErrorBody } from './api-error';

type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
    query?: Record<string, QueryValue>;
    signal?: AbortSignal;
}

const REQUEST_TIMEOUT_MS = 10_000;

/**
Skips undefined values so callers can pass optional filters without checking each one.
*/
function buildUrl(endpoint: string, query: RequestOptions['query']): string {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    const entries = Object.entries(query ?? {});

    for (const [key, value] of entries) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }

    return url.href;
}

/**
The backend reports failures as { "error": "..." }.
*/
function isErrorBody(value: unknown): value is ApiErrorBody {
    return (
        typeof value === 'object' &&
        value !== null &&
        'error' in value &&
        typeof value.error === 'string'
    );
}

/**
Prefers the server's own error message; falls back if the body is not JSON.
*/
async function readErrorMessage(response: Response): Promise<string> {
    let body: unknown;

    try {
        body = await response.json();
    } catch {
        body = undefined;
    }

    return isErrorBody(body) ? body.error : `Request failed with status ${response.status}`;
}

/**
 * Turns low-level fetch failures into messages that are safe to show to the user.
 * A cancellation requested by the caller is returned untouched so the caller can detect it via signal.aborted.
 */
function toRequestError(error: unknown, signal: AbortSignal | undefined): Error {
    if (signal?.aborted && error instanceof Error) return error;

    if (error instanceof DOMException && error.name === 'TimeoutError') {
        return new ApiError('The server took too long to respond. Please try again.');
    }

    // fetch rejects with a bare TypeError("Failed to fetch") on network problems.
    return new ApiError('Network error. Check your connection and try again.');
}

/**
 * The only place that knows the base URL, the timeout and the error format.
 * Throws ApiError for anything the user should see.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { query, signal } = options;
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    // Whichever fires first aborts the request.
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    let response: Response;

    try {
        response = await fetch(buildUrl(endpoint, query), { signal: requestSignal });
    } catch (error) {
        throw toRequestError(error, signal);
    }

    if (!response.ok) {
        throw new ApiError(await readErrorMessage(response), response.status);
    }

    try {
        return (await response.json()) as T;
    } catch {
        throw new ApiError('The server returned an invalid response.');
    }
}
