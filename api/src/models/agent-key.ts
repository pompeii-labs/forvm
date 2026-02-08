import crypto from 'crypto';
import { DataModel } from './datamodel.js';
import supabase from '../util/supabase.js';

export interface AgentKeyData {
    id: string;
    user_id: string;
    key_hash: string;
    label: string;
    created_at: string;
}

export class AgentKey extends DataModel<AgentKeyData> implements AgentKeyData {
    user_id!: string;
    key_hash!: string;
    label!: string;
    created_at!: string;

    static override tableName = 'agent_keys';

    constructor(data: AgentKeyData) {
        super();
        Object.assign(this, data);
    }

    static async generateKey(
        userId: string,
        label: string,
    ): Promise<{ agentKey: AgentKey; rawKey: string }> {
        const rawKey = `fvm_${crypto.randomBytes(12).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const agentKey = await AgentKey.create({
            user_id: userId,
            key_hash: keyHash,
            label,
        });

        return { agentKey, rawKey };
    }

    static async validateKey(rawKey: string): Promise<AgentKey | null> {
        if (!rawKey.startsWith('fvm_')) {
            return null;
        }

        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const { data, error } = await supabase
            .from('agent_keys')
            .select()
            .eq('key_hash', keyHash)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return new AgentKey(data);
    }

    static async listForUser(userId: string): Promise<AgentKey[]> {
        const { data, error } = await supabase
            .from('agent_keys')
            .select()
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row) => new AgentKey(row));
    }

    toSafeJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            label: this.label,
            created_at: this.created_at,
        };
    }
}
