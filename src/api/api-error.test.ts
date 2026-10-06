import { describe, expect, it } from 'vitest';
import { ApiError, getErrorMessage, isBadRequestError, isNotFoundError } from './api-error';

describe('ApiError', () => {
    it('correctly sets message and optional status code', () => {
        const error = new ApiError('Failed to fetch data', 500);
        expect(error.message).toBe('Failed to fetch data');
        expect(error.status).toBe(500);
        expect(error.name).toBe('ApiError');
    });

    it('allows creating an instance without a status code', () => {
        const error = new ApiError('Network disconnected');
        expect(error.status).toBeUndefined();
    });
});

describe('getErrorMessage', () => {
    it('returns the message of an ApiError instance', () => {
        expect(getErrorMessage(new ApiError('Resource locked', 423))).toBe('Resource locked');
    });

    it('returns a generic message for standard Error or unknown exceptions', () => {
        expect(getErrorMessage(new Error('Unexpected system error'))).toBe(
            'Something went wrong. Please try again.',
        );
        expect(getErrorMessage('some string error')).toBe(
            'Something went wrong. Please try again.',
        );
    });
});

describe('isNotFoundError', () => {
    it('returns true only for ApiError with status 404', () => {
        expect(isNotFoundError(new ApiError('Not Found', 404))).toBe(true);
        expect(isNotFoundError(new ApiError('Server Error', 500))).toBe(false);
        expect(isNotFoundError(new Error('Not Found'))).toBe(false);
    });
});

describe('isBadRequestError', () => {
    it('returns true only for ApiError with status 400', () => {
        expect(isBadRequestError(new ApiError('Invalid input', 400))).toBe(true);
        expect(isBadRequestError(new ApiError('Unauthorized', 401))).toBe(false);
        expect(isBadRequestError(new Error('Invalid input'))).toBe(false);
    });
});
