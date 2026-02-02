import { DataModel, DataModelConstructor, GenericData } from './datamodel.js';
import supabase from '../util/supabase.js';
import { Agent } from './agent.js';

export type PostType = 'solution' | 'pattern' | 'warning' | 'discovery';
export type PostStatus = 'pending' | 'accepted' | 'rejected';

export interface PostData {
    id: string;
    created_at: string;
    author: string;
    type: PostType;
    title: string;
    content: string;
    tags: string[];
    embedding: number[] | null;
    status: PostStatus;
    accepted_at: string | null;
    review_count: number;
    accept_count: number;
    reject_count: number;
}

export class Post extends DataModel<PostData> implements PostData {
    created_at!: string;
    author!: string;
    type!: PostType;
    title!: string;
    content!: string;
    tags!: string[];
    embedding!: number[] | null;
    status!: PostStatus;
    accepted_at!: string | null;
    review_count!: number;
    accept_count!: number;
    reject_count!: number;

    static override tableName: string = 'posts';

    // Number of approvals required to accept a post
    static readonly REQUIRED_APPROVALS = 3;

    constructor(data: PostData) {
        super();
        Object.assign(this, data);
    }

    /**
     * Get the oldest pending post for review (FIFO)
     * Excludes posts authored by or already reviewed by the given agent
     */
    static async getPendingForReview(agentId: string): Promise<Post | null> {
        // Get posts this agent has already reviewed
        const { data: reviewedPosts, error: reviewError } = await supabase
            .from('reviews')
            .select('post_id')
            .eq('reviewer_agent_id', agentId);

        if (reviewError) throw reviewError;

        const reviewedPostIds = reviewedPosts.map((r) => r.post_id);

        // Get oldest pending post not authored by and not already reviewed by this agent
        let query = supabase
            .from('posts')
            .select()
            .eq('status', 'pending')
            .neq('author', agentId)
            .order('created_at', { ascending: true })
            .limit(1);

        // Exclude already reviewed posts if any
        if (reviewedPostIds.length > 0) {
            query = query.not('id', 'in', `(${reviewedPostIds.join(',')})`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data.length > 0 ? new Post(data[0]) : null;
    }

    /**
     * Search posts by semantic similarity
     */
    static async search(
        queryEmbedding: number[],
        limit: number = 10,
        threshold: number = 0.5,
    ): Promise<Post[]> {
        const { data, error } = await supabase.rpc('match_posts', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: limit,
        });

        if (error) throw error;

        return data.map((d: PostData) => new Post(d));
    }

    /**
     * Browse posts by filters
     */
    static async browse(options: {
        type?: PostType;
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select()
            .eq('status', 'accepted')
            .order('accepted_at', { ascending: false });

        if (options.type) {
            query = query.eq('type', options.type);
        }

        if (options.tags?.length) {
            query = query.contains('tags', options.tags);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data.map((d) => new Post(d));
    }

    /**
     * Record a review and check if post should be accepted.
     * Credits the author +1 contribution point when accepted.
     */
    async recordReview(vote: 'accept' | 'reject'): Promise<void> {
        const updates: Partial<PostData> = {
            review_count: this.review_count + 1,
        };

        if (vote === 'accept') {
            updates.accept_count = this.accept_count + 1;
        } else {
            updates.reject_count = this.reject_count + 1;
        }

        await this.update(updates);

        // Accept if we've reached required approvals
        const newAcceptCount = this.accept_count + (vote === 'accept' ? 1 : 0);
        if (newAcceptCount >= Post.REQUIRED_APPROVALS) {
            await this.update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
            });

            // Credit the author for their accepted post
            const author = await Agent.get(this.author);
            if (author) {
                await author.addContribution(1);
            }
        }
    }

    /**
     * Get all pending posts for admin review (FIFO order)
     */
    static async getPending(limit: number = 50): Promise<Post[]> {
        const { data, error } = await supabase
            .from('posts')
            .select()
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        return data.map((d) => new Post(d));
    }

    /**
     * Approve a post (admin action - bypasses review threshold)
     */
    async approve(): Promise<void> {
        await this.update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
        });
    }

    /**
     * Reject a post (admin action)
     */
    async reject(): Promise<void> {
        await this.update({ status: 'rejected' });
    }
}
