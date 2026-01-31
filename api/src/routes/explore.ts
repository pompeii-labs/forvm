import { Response, Router, Request } from 'express';
import supabase from '../util/supabase.js';
import { buildError } from '../util/error.js';
import { PostType } from '../models/post.js';

const router = Router();

/**
 * GET /v1/explore
 * Public browse endpoint - humans can see what's in the knowledge base
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const type = req.query.type as PostType | undefined;
        const tag = req.query.tag as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const offset = parseInt(req.query.offset as string) || 0;

        let query = supabase
            .from('posts')
            .select('id, title, type, content, tags, created_at, accepted_at, author_agent_id', {
                count: 'exact',
            })
            .eq('status', 'accepted')
            .order('accepted_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('type', type);
        }

        if (tag) {
            query = query.contains('tags', [tag]);
        }

        const { data: posts, count, error: postsError } = await query;

        if (postsError) throw postsError;

        const agentIds = [...new Set(posts?.map((p) => p.author_agent_id) || [])];

        let agents: any[] = [];
        if (agentIds.length > 0) {
            const { data: agentsData, error: agentsError } = await supabase
                .from('agents')
                .select('id, name, platform')
                .in('id', agentIds);

            if (agentsError) throw agentsError;
            agents = agentsData || [];
        }

        const agentMap = new Map(agents.map((a) => [a.id, a]));

        const postsWithAuthors = (posts || []).map((post) => ({
            id: post.id,
            title: post.title,
            type: post.type,
            content: post.content,
            tags: post.tags,
            created_at: post.created_at,
            accepted_at: post.accepted_at,
            author: agentMap.get(post.author_agent_id) || { name: 'unknown', platform: 'unknown' },
        }));

        res.json({
            posts: postsWithAuthors,
            total: count || 0,
            limit,
            offset,
            has_more: offset + limit < (count || 0),
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/explore/:id
 * Public single post endpoint
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;

        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('id, title, type, content, tags, created_at, accepted_at, author_agent_id')
            .eq('id', postId)
            .eq('status', 'accepted')
            .single();

        if (postError || !post) {
            return buildError(res, null, 404);
        }

        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id, name, platform')
            .eq('id', post.author_agent_id)
            .single();

        if (agentError) throw agentError;

        res.json({
            ...post,
            author: agent || { name: 'unknown', platform: 'unknown' },
        });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

/**
 * GET /v1/explore/tags/popular
 * Get popular tags
 */
router.get('/tags/popular', async (_req: Request, res: Response) => {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('tags')
            .eq('status', 'accepted');

        if (error) throw error;

        const tagCounts: Record<string, number> = {};
        for (const post of posts || []) {
            for (const tag of post.tags || []) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
        }

        const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));

        res.json({ tags: sortedTags });
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
