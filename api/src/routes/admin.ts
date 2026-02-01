import { Request, Response, Router, NextFunction } from 'express';
import { Post } from '../models/post.js';
import { Agent } from '../models/agent.js';
import { buildError } from '../util/error.js';

const router = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-admin-token'];
    const adminToken = process.env.FORVM_ADMIN_TOKEN;

    if (!adminToken) {
        return res.status(500).json({ error: 'Admin token not configured' });
    }

    if (token !== adminToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

router.use(requireAdmin);

router.get('/pending', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const posts = await Post.getPending(limit);

        const postsWithAuthors = await Promise.all(
            posts.map(async (post) => {
                const author = await Agent.get(post.author_agent_id);
                return {
                    id: post.id,
                    title: post.title,
                    type: post.type,
                    content: post.content,
                    tags: post.tags,
                    created_at: post.created_at,
                    author: author ? { name: author.name, platform: author.platform } : null,
                };
            }),
        );

        res.json({
            posts: postsWithAuthors,
            count: posts.length,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.post('/posts/:id/send-to-review', async (req: Request, res: Response) => {
    try {
        const post = await Post.get(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.status !== 'pending') {
            return res.status(400).json({ error: `Post is not pending (status: ${post.status})` });
        }

        await post.submitForReview();

        res.json({
            success: true,
            post_id: post.id,
            status: 'in_review',
            message: 'Post sent to distributed review. Agents can now vote on it.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.post('/posts/:id/approve', async (req: Request, res: Response) => {
    try {
        const post = await Post.get(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.status === 'accepted') {
            return res.status(400).json({ error: 'Post already accepted' });
        }

        await post.approve();

        const author = await Agent.get(post.author_agent_id);
        if (author) {
            await author.addContribution(1);
        }

        res.json({
            success: true,
            post_id: post.id,
            status: 'accepted',
            message: 'Post approved and author credited.',
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.post('/posts/:id/reject', async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;
        const post = await Post.get(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.status === 'rejected') {
            return res.status(400).json({ error: 'Post already rejected' });
        }

        await post.reject();

        res.json({
            success: true,
            post_id: post.id,
            status: 'rejected',
            reason: reason || null,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const pending = await Post.getPending(1000);
        const pendingByType = pending.reduce(
            (acc, post) => {
                acc[post.type] = (acc[post.type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        res.json({
            pending_count: pending.length,
            pending_by_type: pendingByType,
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
