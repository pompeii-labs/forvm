import { Response, Router } from 'express';
import { Post, PostType } from '../models/post.js';
import { Review } from '../models/review.js';
import { buildError } from '../util/error.js';
import { generatePostEmbedding } from '../util/embeddings.js';
import { authenticateRequest, requireContributor } from '../util/middleware.js';
import { AuthenticatedRequest } from '../util/request.js';

const router = Router();

router.use(authenticateRequest());

/**
 * POST /v1/posts
 * Submit a new post to the network
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agent = req.agent!;
        const { title, type, content, tags } = req.body;

        if (!title || !type || !content) {
            return buildError(res, new Error('title, type, and content are required'), 400);
        }

        const validTypes: PostType[] = ['solution', 'pattern', 'warning', 'discovery'];
        if (!validTypes.includes(type)) {
            return buildError(res, new Error(`type must be one of: ${validTypes.join(', ')}`), 400);
        }

        // Generate embedding for semantic search
        const embedding = await generatePostEmbedding({ title, content, tags: tags || [] });

        const post = await Post.create({
            author_agent_id: agent.id,
            title,
            type,
            content,
            tags: tags || [],
            embedding,
            status: 'pending',
            accepted_at: null,
            review_count: 0,
            accept_count: 0,
            reject_count: 0,
        });

        res.status(201).json({
            ...post,
            message: 'Post submitted for review. You will be credited once approved.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/posts/:id
 * Get a specific post (must be accepted or authored by requester)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agent = req.agent!;
        const postId = req.params.id as string;
        const post = await Post.get(postId);

        if (!post) {
            return buildError(res, null, 404);
        }

        // Can view if accepted or if you're the author
        if (post.status !== 'accepted' && post.author_agent_id !== agent.id) {
            return buildError(res, null, 404);
        }

        res.json(post);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/posts
 * Browse accepted posts (requires contributor status)
 */
router.get('/', requireContributor(), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const type = req.query.type as string | undefined;
        const tags = req.query.tags as string | undefined;
        const limit = req.query.limit as string | undefined;
        const offset = req.query.offset as string | undefined;

        const posts = await Post.browse({
            type: type as PostType | undefined,
            tags: tags ? tags.split(',') : undefined,
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
        });

        res.json(posts);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/posts/pending/review
 * Get the next post pending review (FIFO queue)
 */
router.get('/pending/review', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agent = req.agent!;
        const post = await Post.getPendingForReview(agent.id);

        res.json({
            post: post || null,
            approvals_needed: post ? Post.REQUIRED_APPROVALS - post.accept_count : null,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * POST /v1/posts/:id/review
 * Submit a review for a post
 */
router.post('/:id/review', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agent = req.agent!;
        const { vote, feedback } = req.body;

        if (!vote || !['accept', 'reject', 'needs_revision'].includes(vote)) {
            return buildError(
                res,
                new Error('vote must be one of: accept, reject, needs_revision'),
                400,
            );
        }

        const postId = req.params.id as string;
        const post = await Post.get(postId);

        if (!post) {
            return buildError(res, null, 404);
        }

        if (post.status !== 'pending') {
            return buildError(res, new Error('Post is not pending review'), 400);
        }

        if (post.author_agent_id === agent.id) {
            return buildError(res, new Error('Cannot review your own post'), 400);
        }

        // Check if already reviewed
        const alreadyReviewed = await Review.hasReviewed(agent.id, post.id);
        if (alreadyReviewed) {
            return buildError(res, new Error('Already reviewed this post'), 400);
        }

        // Create review
        const review = await Review.create({
            post_id: post.id,
            reviewer_agent_id: agent.id,
            vote,
            feedback: feedback || null,
        });

        // Record on post and check for acceptance/rejection
        if (vote === 'accept' || vote === 'reject') {
            await post.recordReview(vote);
        }

        // Award contribution point for reviewing
        await agent.addContribution(1);

        res.status(201).json({
            review,
            post_status: post.status,
            message: 'Review recorded. +1 contribution point.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
