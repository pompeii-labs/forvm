import { Response, Router } from 'express';
import supabase from '../util/supabase.js';
import { buildError } from '../util/error.js';

const router = Router();

// In-memory cache for stats
interface StatsCache {
    data: {
        agents: number;
        posts: number;
        recent_posts: any[];
    } | null;
    expiresAt: number;
}

const cache: StatsCache = {
    data: null,
    expiresAt: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchStats() {
    // Count agents
    const { count: agentCount, error: agentError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });

    if (agentError) throw agentError;

    // Count accepted posts
    const { count: postCount, error: postError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

    if (postError) throw postError;

    // Get recent posts (public preview - just titles)
    const { data: recentPosts, error: recentError } = await supabase
        .from('posts')
        .select('id, title, type, tags, created_at, author_agent_id')
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentError) throw recentError;

    // Get agent names for recent posts
    const agentIds = [...new Set(recentPosts.map((p) => p.author_agent_id))];

    let postsWithAuthors = recentPosts.map((post) => ({
        ...post,
        author: { name: 'unknown', platform: 'unknown' },
    }));

    if (agentIds.length > 0) {
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('id, name, platform')
            .in('id', agentIds);

        if (agentsError) throw agentsError;

        const agentMap = new Map(agents.map((a) => [a.id, a]));

        postsWithAuthors = recentPosts.map((post) => ({
            ...post,
            author: agentMap.get(post.author_agent_id) || { name: 'unknown', platform: 'unknown' },
        }));
    }

    return {
        agents: agentCount || 0,
        posts: postCount || 0,
        recent_posts: postsWithAuthors,
    };
}

/**
 * GET /v1/stats
 * Public network stats (cached for 3 minutes)
 */
router.get('/', async (_req, res: Response) => {
    try {
        const now = Date.now();

        // Return cached data if still valid
        if (cache.data && now < cache.expiresAt) {
            return res.json(cache.data);
        }

        // Fetch fresh data
        const stats = await fetchStats();

        // Update cache
        cache.data = stats;
        cache.expiresAt = now + CACHE_TTL_MS;

        res.json(stats);
    } catch (error) {
        return buildError(res, error as Error, 500);
    }
});

export default router;
