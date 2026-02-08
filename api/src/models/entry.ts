import { DataModel } from './datamodel.js';
import supabase from '../util/supabase.js';

export type EntrySource = 'human' | 'agent' | 'human_prompted_agent';

export interface EntryData {
    id: string;
    title: string;
    context: string;
    body: string;
    tags: string[];
    source: EntrySource;
    reviewed: boolean;
    reviewed_by: string | null;
    reviewed_at: string | null;
    author_user_id: string;
    author_agent_name: string | null;
    embedding: number[] | null;
    created_at: string;
    updated_at: string;
    similarity?: number;
}

export class Entry extends DataModel<EntryData> implements EntryData {
    title!: string;
    context!: string;
    body!: string;
    tags!: string[];
    source!: EntrySource;
    reviewed!: boolean;
    reviewed_by!: string | null;
    reviewed_at!: string | null;
    author_user_id!: string;
    author_agent_name!: string | null;
    embedding!: number[] | null;
    created_at!: string;
    updated_at!: string;
    similarity?: number;

    static override tableName = 'entries';

    constructor(data: EntryData) {
        super();
        Object.assign(this, data);
    }

    static async search(
        queryEmbedding: number[],
        limit: number = 10,
        threshold: number = 0.3,
        filterTags?: string[],
    ): Promise<Entry[]> {
        const { data, error } = await supabase.rpc('match_entries', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: limit,
            filter_tags: filterTags && filterTags.length > 0 ? filterTags : null,
        });

        if (error) throw error;

        return (data || []).map((row: EntryData) => new Entry(row));
    }

    static async browse(options: {
        tags?: string[];
        reviewed?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<Entry[]> {
        const limit = options.limit ?? 20;
        const offset = options.offset ?? 0;

        let query = supabase
            .from('entries')
            .select()
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (options.tags && options.tags.length > 0) {
            query = query.contains('tags', options.tags);
        }

        if (typeof options.reviewed === 'boolean') {
            query = query.eq('reviewed', options.reviewed);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((row) => new Entry(row));
    }

    static async getUnreviewed(limit: number = 50): Promise<Entry[]> {
        const { data, error } = await supabase
            .from('entries')
            .select()
            .eq('reviewed', false)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((row) => new Entry(row));
    }

    async markReviewed(reviewerUserId: string): Promise<void> {
        const now = new Date().toISOString();
        await this.update({
            reviewed: true,
            reviewed_by: reviewerUserId,
            reviewed_at: now,
        });
    }
}
