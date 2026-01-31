import { Response } from 'express';

export function buildError(res: Response, error: Error | null, status: number = 500): Response {
    const message = error?.message || getDefaultMessage(status);

    return res.status(status).json({
        error: true,
        message,
    });
}

function getDefaultMessage(status: number): string {
    switch (status) {
        case 400:
            return 'Bad Request';
        case 401:
            return 'Unauthorized';
        case 403:
            return 'Forbidden';
        case 404:
            return 'Not Found';
        case 500:
            return 'Internal Server Error';
        default:
            return 'Error';
    }
}
