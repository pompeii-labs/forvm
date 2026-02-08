import { Response, Router } from 'express';
import { AgentKey } from '../models/agent-key.js';
import { buildError } from '../util/error.js';
import { authenticateRequest, requireJwtAuth } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

router.use(authenticateRequest());
router.use(requireJwtAuth());

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const label = String(req.body?.label || '').trim();

        if (!label) {
            return buildError(res, new Error('label is required'), 400);
        }

        const { agentKey, rawKey } = await AgentKey.generateKey(userId, label);

        res.status(201).json({
            id: agentKey.id,
            label: agentKey.label,
            created_at: agentKey.created_at,
            key: rawKey,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const keys = await AgentKey.listForUser(userId);

        res.json(
            keys.map((key) => ({
                id: key.id,
                label: key.label,
                created_at: key.created_at,
            })),
        );
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const key = await AgentKey.get(req.params.id as string);

        if (!key || key.user_id !== req.userId) {
            return buildError(res, null, 404);
        }

        await key.delete();
        res.json({ success: true });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
