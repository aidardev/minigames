import { HttpStatus } from '@/utils/status-codes';

export interface ApiErrorBody {
    error: string;
}

export class ApiError extends Error {
    public readonly status: number | undefined;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export function getErrorMessage(error: unknown): string {
    return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export function isNotFoundError(error: unknown): boolean {
    return error instanceof ApiError && error.status === HttpStatus.NOT_FOUND;
}

export function isBadRequestError(error: unknown): boolean {
    return error instanceof ApiError && error.status === HttpStatus.BAD_REQUEST;
}
