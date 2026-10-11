import { describe, expect, it } from 'vitest';
import { ApiError, getErrorMessage, isBadRequestError, isNotFoundError } from './api-error';

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

describe('ApiError', () => {
    it('keeps the message and the status code', () => {
        const error = new ApiError('Failed to fetch data', 500);

        expect(error.message).toBe('Failed to fetch data');
        expect(error.status).toBe(500);
    });

    it('has no status when it is not an HTTP error', () => {
        expect(new ApiError('Network disconnected').status).toBeUndefined();
    });

    it('is a named Error, so it can be thrown and caught like any other error', () => {
        const error = new ApiError('boom');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ApiError');
    });
});

describe('getErrorMessage', () => {
    it('returns the message of an ApiError', () => {
        expect(getErrorMessage(new ApiError('Game not found', 404))).toBe('Game not found');
    });

    it.each([
        ['a plain Error', new Error('internal details')],
        ['a string', 'some string error'],
        ['undefined', undefined],
    ])('hides the details of %s behind a generic message', (_case, error) => {
        expect(getErrorMessage(error)).toBe(GENERIC_MESSAGE);
    });
});

describe('isNotFoundError', () => {
    it('is true for an ApiError with status 404', () => {
        expect(isNotFoundError(new ApiError('Not found', 404))).toBe(true);
    });

    it.each([
        ['another status', new ApiError('Server error', 500)],
        ['no status', new ApiError('Network error')],
        ['a plain Error', new Error('Not found')],
        ['a non-ApiError object that only looks like one', { status: 404 }],
    ])('is false for %s', (_case, error) => {
        expect(isNotFoundError(error)).toBe(false);
    });
});

describe('isBadRequestError', () => {
    it('is true for an ApiError with status 400', () => {
        expect(isBadRequestError(new ApiError('Invalid input', 400))).toBe(true);
    });

    it.each([
        ['another status', new ApiError('Not found', 404)],
        ['no status', new ApiError('Network error')],
        ['a plain Error', new Error('Invalid input')],
        ['a non-ApiError object that only looks like one', { status: 400 }],
    ])('is false for %s', (_case, error) => {
        expect(isBadRequestError(error)).toBe(false);
    });
});
