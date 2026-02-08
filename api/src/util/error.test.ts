import { describe, expect, it } from 'bun:test';
import { buildError } from './error.js';

function createMockResponse() {
    const state: { statusCode: number | null; body: any } = {
        statusCode: null,
        body: null,
    };

    const res = {
        status(code: number) {
            state.statusCode = code;
            return this;
        },
        json(payload: any) {
            state.body = payload;
            return this;
        },
    };

    return { res: res as any, state };
}

describe('buildError', () => {
    it('uses provided error message when available', () => {
        const { res, state } = createMockResponse();

        const returned = buildError(res, new Error('Custom failure'), 422);

        expect(returned).toBe(res);
        expect(state.statusCode).toBe(422);
        expect(state.body).toEqual({
            error: true,
            message: 'Custom failure',
        });
    });

    it('falls back to default message for known status codes', () => {
        const { res, state } = createMockResponse();

        buildError(res, null, 404);

        expect(state.statusCode).toBe(404);
        expect(state.body).toEqual({
            error: true,
            message: 'Not Found',
        });
    });

    it('defaults to internal server error when status is omitted', () => {
        const { res, state } = createMockResponse();

        buildError(res, null);

        expect(state.statusCode).toBe(500);
        expect(state.body).toEqual({
            error: true,
            message: 'Internal Server Error',
        });
    });

    it('uses generic message for unknown status codes', () => {
        const { res, state } = createMockResponse();

        buildError(res, null, 418);

        expect(state.statusCode).toBe(418);
        expect(state.body).toEqual({
            error: true,
            message: 'Error',
        });
    });
});

