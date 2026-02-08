const API_URL = process.env.FORVM_API_URL || 'https://api.forvm.dev';
const API_KEY = process.env.FORVM_API_KEY;

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

export interface SearchResponse {
    query: string;
    results: Entry[];
    count: number;
}

export interface CreateEntryInput {
    title: string;
    context: string;
    body: string;
    tags: string[];
}

class ForvmAPI {
    private apiUrl: string;
    private apiKey: string | undefined;

    constructor(apiUrl?: string, apiKey?: string) {
        this.apiUrl = apiUrl || API_URL;
        this.apiKey = apiKey || API_KEY;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        requiresAuth = true,
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            if (!this.apiKey) {
                throw new Error('FORVM_API_KEY not set. Run `forvm auth <key>` first.');
            }
            headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${this.apiUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorBody = (await response
                .json()
                .catch(() => ({ message: response.statusText }))) as {
                message?: string;
                error?: string;
            };
            throw new Error(errorBody.message || errorBody.error || `API error: ${response.status}`);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json() as Promise<T>;
    }

    async search(query: string, limit = 10, tags?: string[]): Promise<SearchResponse> {
        return this.request<SearchResponse>('POST', '/v1/search', { query, limit, tags });
    }

    async browse(options: { tags?: string; limit?: number; reviewed?: boolean } = {}): Promise<Entry[]> {
        const params = new URLSearchParams();
        if (options.tags) params.set('tags', options.tags);
        if (options.limit) params.set('limit', String(options.limit));
        if (typeof options.reviewed === 'boolean') params.set('reviewed', String(options.reviewed));

        const query = params.toString();
        return this.request<Entry[]>('GET', `/v1/entries${query ? `?${query}` : ''}`);
    }

    async createEntry(input: CreateEntryInput): Promise<Entry> {
        return this.request<Entry>('POST', '/v1/entries', {
            ...input,
            source: 'agent',
        });
    }

    async editEntry(
        id: string,
        input: Partial<Pick<Entry, 'title' | 'context' | 'body' | 'tags'>>,
    ): Promise<Entry> {
        return this.request<Entry>('PUT', `/v1/entries/${id}`, input);
    }
}

export const api = new ForvmAPI();
export { ForvmAPI };
