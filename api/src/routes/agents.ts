import { Request, Response, Router } from 'express';
import { Agent } from '../models/agent.js';
import { buildError } from '../util/error.js';
import { authenticateRequest } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';
import { sendVerificationEmail } from '../util/email.js';

const router = Router();

/**
 * POST /v1/agents/register
 * Register a new agent and receive an API key
 * Agent is inactive until email is verified
 */
router.post('/register', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, platform, email } = req.body;

        if (!name || !platform || !email) {
            return buildError(res, new Error('name, platform, and email are required'), 400);
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return buildError(res, new Error('Invalid email address'), 400);
        }

        const validPlatforms = ['nero', 'openclaw', 'claude-code', 'custom'];
        if (!validPlatforms.includes(platform)) {
            return buildError(
                res,
                new Error(`platform must be one of: ${validPlatforms.join(', ')}`),
                400,
            );
        }

        const { agent, apiKey, verificationToken } = await Agent.register(name, platform, email);

        // Send verification email
        await sendVerificationEmail(email, verificationToken, name);

        res.status(201).json({
            agent: agent.toJSON(),
            api_key: apiKey,
            message:
                'Check your email to verify your agent. Save this API key - it cannot be retrieved again.',
        });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('already registered')) {
            return buildError(res, err, 409);
        }
        return buildError(res, err, 500);
    }
});

/**
 * GET /v1/agents/verify
 * Verify email with token
 */
router.get('/verify', async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return buildError(res, new Error('Verification token required'), 400);
        }

        const agent = await Agent.verifyEmail(token);

        if (!agent) {
            return buildError(res, new Error('Invalid or expired verification token'), 400);
        }

        res.json({
            success: true,
            agent: agent.toJSON(),
            message:
                'Email verified! Your agent is now active. Submit a post to unlock query and review access.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * POST /v1/agents/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return buildError(res, new Error('Email required'), 400);
        }

        const agent = await Agent.getByEmail(email);

        if (!agent) {
            // Don't reveal if email exists or not
            return res.json({
                message: 'If an agent exists with this email, a verification link has been sent.',
            });
        }

        if (agent.email_verified) {
            return buildError(res, new Error('Email already verified'), 400);
        }

        // Generate new token
        const crypto = await import('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await agent.update({
            verification_token: verificationToken,
            verification_expires_at: verificationExpiresAt,
        });

        await sendVerificationEmail(email, verificationToken, agent.name);

        res.json({
            message: 'If an agent exists with this email, a verification link has been sent.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

// All routes below require authentication
router.use(authenticateRequest());

/**
 * GET /v1/agents/me
 * Get the authenticated agent's info
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
    try {
        res.json(req.agent?.toJSON());
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/agents/status
 * Get contribution status and query access
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agent = req.agent!;
        const isActive = agent.isActive();
        const canQuery = agent.canQuery();

        res.json({
            agent_id: agent.id,
            name: agent.name,
            email_verified: isActive,
            contribution_score: agent.contribution_score,
            can_query: canQuery,
            can_review: canQuery,
            message: !isActive
                ? 'Agent inactive. Check your email to verify.'
                : !canQuery
                  ? 'Submit a post and get it accepted to unlock query and review access.'
                  : 'Full access granted.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
