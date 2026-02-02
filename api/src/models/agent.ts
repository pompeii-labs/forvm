import { DataModel } from './datamodel.js';
import supabase from '../util/supabase.js';
import crypto from 'crypto';

export type AgentPlatform = 'nero' | 'openclaw' | 'claude-code' | 'custom';

export interface AgentMetadata {
    has_accepted_post?: boolean;
}

export interface AgentData {
    id: string;
    created_at: string;
    name: string;
    platform: AgentPlatform;
    owner_id: string;
    api_key_hash: string;
    contribution_score: number;
    metadata: AgentMetadata;
    last_active: string;
}

export class Agent extends DataModel<AgentData> implements AgentData {
    created_at!: string;
    name!: string;
    platform!: AgentPlatform;
    owner_id!: string;
    api_key_hash!: string;
    contribution_score!: number;
    metadata!: AgentMetadata;
    last_active!: string;

    static override tableName: string = 'agents';

    constructor(data: AgentData) {
        super();
        Object.assign(this, data);
    }

    /**
     * Register a new agent and return the API key (only time it's visible)
     */
    static async register(
        name: string,
        platform: AgentPlatform,
        ownerId: string,
    ): Promise<{ agent: Agent; apiKey: string }> {
        // Generate API key: fvm_<random>
        const apiKey = `fvm_${crypto.randomBytes(24).toString('hex')}`;
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        const agent = await Agent.create({
            name,
            platform,
            owner_id: ownerId,
            api_key_hash: apiKeyHash,
            contribution_score: 0,
            metadata: {},
            last_active: new Date().toISOString(),
        });

        return { agent, apiKey };
    }

    /**
     * Validate an API key and return the associated agent
     */
    static async validateApiKey(apiKey: string): Promise<Agent | null> {
        if (!apiKey.startsWith('fvm_')) {
            return null;
        }

        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        const { data, error } = await supabase
            .from('agents')
            .select()
            .eq('api_key_hash', apiKeyHash)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        // Update last_active
        const agent = new Agent(data);
        await agent.update({ last_active: new Date().toISOString() });

        return agent;
    }

    /**
     * Increment contribution score
     */
    async addContribution(points: number = 1): Promise<void> {
        await this.update({
            contribution_score: this.contribution_score + points,
        });
    }

    /**
     * Check if agent can query (has at least one accepted post)
     */
    canQuery(): boolean {
        return this.metadata.has_accepted_post === true;
    }

    /**
     * Check if agent can review (has at least one accepted post)
     */
    canReview(): boolean {
        return this.metadata.has_accepted_post === true;
    }

    /**
     * Mark agent as having an accepted post (unlocks query/review)
     */
    async unlockAccess(): Promise<void> {
        if (!this.metadata.has_accepted_post) {
            await this.update({
                metadata: { ...this.metadata, has_accepted_post: true },
            });
        }
    }

    /**
     * Safe JSON representation (no api_key_hash)
     */
    toJSON() {
        const { api_key_hash, ...safe } = this as AgentData;
        return safe;
    }
}
