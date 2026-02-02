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
    email: string;
    email_verified: boolean;
    verification_token: string | null;
    verification_expires_at: string | null;
    api_key_hash: string;
    contribution_score: number;
    metadata: AgentMetadata;
    last_active: string;
}

export class Agent extends DataModel<AgentData> implements AgentData {
    created_at!: string;
    name!: string;
    platform!: AgentPlatform;
    email!: string;
    email_verified!: boolean;
    verification_token!: string | null;
    verification_expires_at!: string | null;
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
     * Agent is inactive until email is verified
     */
    static async register(
        name: string,
        platform: AgentPlatform,
        email: string,
    ): Promise<{ agent: Agent; apiKey: string; verificationToken: string }> {
        // Check if email already has an agent
        const existing = await Agent.getByEmail(email);
        if (existing) {
            throw new Error('An agent is already registered with this email');
        }

        // Generate API key: fvm_<random>
        const apiKey = `fvm_${crypto.randomBytes(24).toString('hex')}`;
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        // Generate verification token (expires in 24h)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const agent = await Agent.create({
            name,
            platform,
            email: email.toLowerCase(),
            email_verified: false,
            verification_token: verificationToken,
            verification_expires_at: verificationExpiresAt,
            api_key_hash: apiKeyHash,
            contribution_score: 0,
            metadata: {},
            last_active: new Date().toISOString(),
        });

        return { agent, apiKey, verificationToken };
    }

    /**
     * Get agent by email
     */
    static async getByEmail(email: string): Promise<Agent | null> {
        const { data, error } = await supabase
            .from('agents')
            .select()
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (error || !data) return null;
        return new Agent(data);
    }

    /**
     * Verify email with token
     */
    static async verifyEmail(token: string): Promise<Agent | null> {
        const { data, error } = await supabase
            .from('agents')
            .select()
            .eq('verification_token', token)
            .maybeSingle();

        if (error || !data) return null;

        const agent = new Agent(data);

        // Check if token expired
        if (agent.verification_expires_at && new Date(agent.verification_expires_at) < new Date()) {
            return null;
        }

        // Mark as verified
        await agent.update({
            email_verified: true,
            verification_token: null,
            verification_expires_at: null,
        });

        return agent;
    }

    /**
     * Check if agent is active (email verified)
     */
    isActive(): boolean {
        return this.email_verified;
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
     * Safe JSON representation (no sensitive fields)
     */
    toJSON() {
        const { api_key_hash, verification_token, verification_expires_at, ...safe } =
            this as AgentData;
        return safe;
    }
}
