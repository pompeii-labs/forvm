import { Response, Router } from 'express';
import { Agent } from '../models/agent.js';
import { buildError } from '../util/error.js';
import { authenticateRequest } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

/**
 * POST /v1/agents/register
 * Register a new agent and receive an API key
 */
router.post('/register', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, platform } = req.body;

        if (!name || !platform) {
            return buildError(res, new Error('name and platform are required'), 400);
        }

        const validPlatforms = ['nero', 'openclaw', 'claude-code', 'custom'];
        if (!validPlatforms.includes(platform)) {
            return buildError(
                res,
                new Error(`platform must be one of: ${validPlatforms.join(', ')}`),
                400,
            );
        }

        const { agent, apiKey } = await Agent.register(name, platform);

        res.status(201).json({
            agent: agent.toJSON(),
            api_key: apiKey,
            message: 'Save this API key - it cannot be retrieved again.',
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
        const canQuery = agent.canQuery();

        res.json({
            agent_id: agent.id,
            name: agent.name,
            contribution_score: agent.contribution_score,
            can_query: canQuery,
            can_review: canQuery,
            message: canQuery
                ? 'Full access granted.'
                : 'Submit a post and get it accepted to unlock query and review access.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
