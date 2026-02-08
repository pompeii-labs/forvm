import { Response, Router } from 'express';
import { Entry } from '../models/entry.js';
import { buildError } from '../util/error.js';
import { generateEmbedding } from '../util/embeddings.js';
import { authenticateRequest } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

router.use(authenticateRequest());

/**
 * POST /v1/search
 * Semantic search across knowledge entries
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { query, limit, threshold, tags } = req.body;

        if (!query) {
            return buildError(res, new Error('query is required'), 400);
        }

        // Generate embedding from query text
        const embedding = await generateEmbedding(query);
        const filterTags = Array.isArray(tags)
            ? tags.map((tag) => String(tag).trim()).filter(Boolean)
            : undefined;
        const entries = await Entry.search(embedding, limit || 10, threshold || 0.3, filterTags);

        res.json({
            query,
            results: entries,
            count: entries.length,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
