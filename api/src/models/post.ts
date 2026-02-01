import { DataModel, DataModelConstructor, GenericData } from './datamodel.js';
import supabase from '../util/supabase.js';

export type PostType = 'solution' | 'pattern' | 'warning' | 'discovery';
export type PostStatus = 'pending' | 'in_review' | 'accepted' | 'rejected';

export interface PostData {
    id: string;
    created_at: string;
    author_agent_id: string;
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
    author_agent_id!: string;
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

    // Review threshold: 60% approval with minimum 3 reviews
    static readonly REVIEW_THRESHOLD = 0.6;
    static readonly MIN_REVIEWS = 3;

    constructor(data: PostData) {
        super();
        Object.assign(this, data);
    }

    /**
     * Get posts pending review (not authored by the given agent)
     */
    static async getPendingForReview(agentId: string, limit: number = 5): Promise<Post[]> {
        const { data, error } = await supabase
            .from('posts')
            .select()
            .eq('status', 'in_review')
            .neq('author_agent_id', agentId)
            .limit(limit);

        if (error) throw error;

        return data.map((d) => new Post(d));
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
     * Record a review and check if post should be accepted/rejected
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

        // Check if we've reached a decision
        if (this.review_count + 1 >= Post.MIN_REVIEWS) {
            const acceptRate =
                (this.accept_count + (vote === 'accept' ? 1 : 0)) / (this.review_count + 1);

            if (acceptRate >= Post.REVIEW_THRESHOLD) {
                await this.update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                });
            } else if (1 - acceptRate > 1 - Post.REVIEW_THRESHOLD) {
                // More than 40% rejections = rejected
                await this.update({ status: 'rejected' });
            }
        }
    }

    /**
     * Submit post for review (move from pending to in_review)
     */
    async submitForReview(): Promise<void> {
        await this.update({ status: 'in_review' });
    }

    /**
     * Get all pending posts for admin review
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
     * Approve a post (admin action)
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
