import { HttpStatus } from '@/utils/status-codes';
import { describe, expect, it } from 'vitest';
import { ApiError, getErrorMessage, isBadRequestError, isNotFoundError } from './api-error';

describe('ApiError', () => {
    it('correctly sets message and optional status code', () => {
        const error = new ApiError('Failed to fetch data', HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.message).toBe('Failed to fetch data');
        expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.name).toBe('ApiError');
    });

    it('allows creating an instance without a status code', () => {
        const error = new ApiError('Network disconnected');
        expect(error.status).toBeUndefined();
    });
});

describe('getErrorMessage', () => {
    it('returns the message of an ApiError instance', () => {
        expect(
            getErrorMessage(new ApiError('Server error', HttpStatus.INTERNAL_SERVER_ERROR)),
        ).toBe('Server error');
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
        expect(isNotFoundError(new ApiError('Not Found', HttpStatus.NOT_FOUND))).toBe(true);
        expect(
            isNotFoundError(new ApiError('Server Error', HttpStatus.INTERNAL_SERVER_ERROR)),
        ).toBe(false);
        expect(isNotFoundError(new Error('Not Found'))).toBe(false);
    });
});

describe('isBadRequestError', () => {
    it('returns true only for ApiError with status 400', () => {
        expect(isBadRequestError(new ApiError('Invalid input', HttpStatus.BAD_REQUEST))).toBe(true);
        expect(isBadRequestError(new ApiError('Unauthorized', HttpStatus.UNAUTHORIZED))).toBe(
            false,
        );
        expect(isBadRequestError(new Error('Invalid input'))).toBe(false);
    });
});
