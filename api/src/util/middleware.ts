import { Request, Response, NextFunction } from 'express';
import { AgentKey } from '../models/agent-key.js';
import { buildError } from './error.js';
import { AuthenticatedRequest } from './request.js';
import chalk from 'chalk';
import supabase from './supabase.js';

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

async function authenticateWithApiKey(req: Request, rawKey: string): Promise<boolean> {
    const agentKey = await AgentKey.validateKey(rawKey);
    if (!agentKey) {
        return false;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.userId = agentKey.user_id;
    authReq.agentKeyLabel = agentKey.label;
    return true;
}

async function authenticateWithJwt(req: Request, token: string): Promise<boolean> {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        return false;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.userId = data.user.id;
    authReq.agentKeyLabel = undefined;
    return true;
}

export function authenticateRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
        const run = async () => {
            try {
                const xApiKey = normalizeHeaderValue(req.headers['x-api-key']);
                if (xApiKey && xApiKey.startsWith('fvm_')) {
                    const ok = await authenticateWithApiKey(req, xApiKey);
                    if (ok) return next();
                }

                const authHeader = normalizeHeaderValue(req.headers['authorization']);
                if (authHeader?.startsWith('Bearer ')) {
                    const token = authHeader.slice(7).trim();

                    if (token.startsWith('fvm_')) {
                        const ok = await authenticateWithApiKey(req, token);
                        if (ok) return next();
                    } else {
                        const ok = await authenticateWithJwt(req, token);
                        if (ok) return next();
                    }
                }
            } catch (error) {
                console.error('Auth error:', error);
            }

            return buildError(res, new Error('Authentication Failed'), 401);
        };

        run().catch((error) => {
            console.error('Auth middleware error:', error);
            return buildError(res, new Error('Authentication Failed'), 401);
        });
    };
}

export function requireJwtAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.userId) {
            return buildError(res, new Error('Authentication required'), 401);
        }
        if (authReq.agentKeyLabel) {
            return buildError(res, new Error('Supabase JWT required for this endpoint'), 403);
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
