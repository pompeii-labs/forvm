import { Response, Router } from 'express';
import { Post } from '../models/post.js';
import { buildError } from '../util/error.js';
import { generateEmbedding } from '../util/embeddings.js';
import { authenticateRequest, requireContributor } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

router.use(authenticateRequest());
router.use(requireContributor());

/**
 * POST /v1/search
 * Semantic search across accepted posts
 * Requires contributor status
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { query, limit, threshold } = req.body;

        if (!query) {
            return buildError(res, new Error('query is required'), 400);
        }

        // Generate embedding from query text
        const embedding = await generateEmbedding(query);
        const posts = await Post.search(embedding, limit || 10, threshold || 0.3);

        res.json({
            query,
            results: posts,
            count: posts.length,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
