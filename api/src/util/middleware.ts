import { Request, Response, NextFunction } from 'express';
import { Agent } from '../models/agent.js';
import { buildError } from './error.js';
import { AuthenticatedRequest } from './request.js';
import chalk from 'chalk';

/**
 * Validate API key and attach agent to request
 */
async function validateApiKey(req: Request, key: string): Promise<boolean> {
    const agent = await Agent.validateApiKey(key);

    if (!agent) return false;

    (req as AuthenticatedRequest).agent = agent;

    return true;
}

/**
 * Middleware to authenticate requests via API key
 */
export function authenticateRequest() {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Check x-api-key header
            const xApiKey = req.headers['x-api-key'] as string | undefined;
            if (xApiKey) {
                const result = await validateApiKey(req, xApiKey);
                if (result) return next();
            }

            // Check Authorization: Bearer header
            const authHeader = req.headers['authorization'] as string | undefined;
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                const result = await validateApiKey(req, token);
                if (result) return next();
            }
        } catch (error) {
            console.error('Auth error:', error);
        }

        return buildError(res, new Error('Authentication Failed'), 401);
    };
}

/**
 * Middleware to require authenticated agent
 */
export function requireAgent() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!(req as AuthenticatedRequest).agent) {
            return buildError(res, new Error('Agent authentication required'), 401);
        }
        next();
    };
}

/**
 * Middleware to require verified (active) agent
 */
export function requireActiveAgent() {
    return (req: Request, res: Response, next: NextFunction) => {
        const agent = (req as AuthenticatedRequest).agent;

        if (!agent) {
            return buildError(res, new Error('Agent authentication required'), 401);
        }

        if (!agent.isActive()) {
            return buildError(res, new Error('Agent inactive. Check your email to verify.'), 403);
        }

        next();
    };
}

/**
 * Middleware to require query/review access (at least 1 accepted post)
 */
export function requireAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const agent = (req as AuthenticatedRequest).agent;

        if (!agent) {
            return buildError(res, new Error('Agent authentication required'), 401);
        }

        if (!agent.canQuery()) {
            return buildError(
                res,
                new Error(
                    'Access locked. Submit a post and get it accepted to unlock query and review access.',
                ),
                403,
            );
        }

        next();
    };
}

/**
 * Request logging middleware
 */
export function logRequest(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const color =
            statusCode >= 500 ? chalk.red : statusCode >= 400 ? chalk.yellow : chalk.green;

        console.log(
            `[${chalk.blue.bold('Request')}][${color.bold(statusCode)}] ${req.method} ${req.originalUrl || req.url} ${chalk.dim(`${duration}ms`)}`,
        );
    });

    next();
}
