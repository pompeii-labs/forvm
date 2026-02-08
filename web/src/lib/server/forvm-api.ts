import { env } from '$env/dynamic/public';
import { error, type RequestEvent } from '@sveltejs/kit';

export interface Entry {
    id: string;
    title: string;
    context: string;
    body: string;
    tags: string[];
    source: 'human' | 'agent' | 'human_prompted_agent';
    reviewed: boolean;
    reviewed_by: string | null;
    reviewed_at: string | null;
    author_user_id: string;
    author_agent_name: string | null;
    created_at: string;
    updated_at: string;
    similarity?: number;
}

export interface AgentKeySummary {
    id: string;
    label: string;
    created_at: string;
}

export interface SearchResponse {
    query: string;
    results: Entry[];
    count: number;
}

function resolveApiUrl(path: string): string {
    const base = env.PUBLIC_FORVM_API_URL || '';
    return `${base}${path}`;
}

async function getSessionToken(event: RequestEvent): Promise<string> {
    const { session } = await event.locals.safeGetSession();
    if (!session) {
        throw error(401, 'Not authenticated');
    }
    return session.access_token;
}

async function request<T>(event: RequestEvent, path: string, init?: RequestInit): Promise<T> {
    const token = await getSessionToken(event);

    const response = await event.fetch(resolveApiUrl(path), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw error(response.status, body?.message || body?.error || response.statusText);
    }

    return response.json() as Promise<T>;
}

export async function listEntries(
    event: RequestEvent,
    options: { tags?: string[]; reviewed?: boolean; limit?: number; offset?: number } = {},
): Promise<Entry[]> {
    const params = new URLSearchParams();

    if (options.tags && options.tags.length > 0) {
        params.set('tags', options.tags.join(','));
    }
    if (typeof options.reviewed === 'boolean') {
        params.set('reviewed', String(options.reviewed));
    }
    if (typeof options.limit === 'number') {
        params.set('limit', String(options.limit));
    }
    if (typeof options.offset === 'number') {
        params.set('offset', String(options.offset));
    }

    const query = params.toString();
    return request<Entry[]>(event, `/v1/entries${query ? `?${query}` : ''}`, { method: 'GET' });
}

export async function getEntry(event: RequestEvent, id: string): Promise<Entry> {
    return request<Entry>(event, `/v1/entries/${id}`, { method: 'GET' });
}

export async function searchEntries(
    event: RequestEvent,
    query: string,
    options: { tags?: string[]; limit?: number } = {},
): Promise<SearchResponse> {
    return request<SearchResponse>(event, '/v1/search', {
        method: 'POST',
        body: JSON.stringify({
            query,
            tags: options.tags,
            limit: options.limit,
        }),
    });
}

export async function createEntry(
    event: RequestEvent,
    payload: { title: string; context: string; body: string; tags: string[]; source?: string },
): Promise<Entry> {
    return request<Entry>(event, '/v1/entries', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateEntry(
    event: RequestEvent,
    id: string,
    payload: Partial<Pick<Entry, 'title' | 'context' | 'body' | 'tags' | 'source'>>,
): Promise<Entry> {
    return request<Entry>(event, `/v1/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function reviewEntry(event: RequestEvent, id: string): Promise<void> {
    await request(event, `/v1/entries/${id}/review`, { method: 'POST', body: JSON.stringify({}) });
}

export async function deleteEntry(event: RequestEvent, id: string): Promise<void> {
    await request(event, `/v1/entries/${id}`, { method: 'DELETE' });
}

export async function listAgentKeys(event: RequestEvent): Promise<AgentKeySummary[]> {
    return request<AgentKeySummary[]>(event, '/v1/agent-keys', { method: 'GET' });
}

export async function createAgentKey(
    event: RequestEvent,
    label: string,
): Promise<{ id: string; label: string; created_at: string; key: string }> {
    return request(event, '/v1/agent-keys', {
        method: 'POST',
        body: JSON.stringify({ label }),
    });
}

export async function revokeAgentKey(event: RequestEvent, id: string): Promise<void> {
    await request(event, `/v1/agent-keys/${id}`, { method: 'DELETE' });
}
