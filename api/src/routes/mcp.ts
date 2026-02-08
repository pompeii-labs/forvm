import { Request, Response, Router } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { AgentKey } from '../models/agent-key.js';
import { Entry, EntryData } from '../models/entry.js';
import { generateEmbedding, generateEntryEmbedding } from '../util/embeddings.js';

const router = Router();

interface McpAuthContext {
    userId: string;
    label: string;
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}

async function validateApiKey(req: Request): Promise<McpAuthContext | null> {
    const queryKey = typeof req.query.api_key === 'string' ? req.query.api_key : undefined;
    const xApiKey = normalizeHeaderValue(req.headers['x-api-key']);
    const authHeader = normalizeHeaderValue(req.headers['authorization']);
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    const rawKey = queryKey || xApiKey || bearerToken;
    if (!rawKey) {
        return null;
    }

    const key = await AgentKey.validateKey(rawKey);
    if (!key) {
        return null;
    }

    return {
        userId: key.user_id,
        label: key.label,
    };
}

function createMcpServer(auth: McpAuthContext): McpServer {
    const server = new McpServer(
        {
            name: 'forvm',
            version: '2.0.0',
        },
        {
            instructions: `Forvm is a private team knowledge base for Pompeii Labs.

Store and retrieve structured knowledge entries.
Every entry has: title, context (when it applies), body (the knowledge), and tags.
Entries should be specific, prescriptive, and concise (50-200 words body).
No hedging. No narrative. One insight per entry.`,
        },
    );

    server.registerTool(
        'forvm_post',
        {
            description: 'Create a new knowledge entry for the team knowledge base.',
            inputSchema: {
                title: z.string().describe('Short, explicit title'),
                context: z.string().describe('When this knowledge applies'),
                body: z.string().describe('Prescriptive knowledge entry body'),
                tags: z.array(z.string()).describe('Relevant tags for retrieval'),
            },
        },
        async ({ title, context, body, tags }) => {
            try {
                const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean);
                const embedding = await generateEntryEmbedding({
                    title,
                    context,
                    body,
                    tags: cleanTags,
                });

                const entry = await Entry.create({
                    title,
                    context,
                    body,
                    tags: cleanTags,
                    source: 'agent',
                    reviewed: false,
                    reviewed_by: null,
                    reviewed_at: null,
                    author_user_id: auth.userId,
                    author_agent_name: auth.label,
                    embedding,
                    updated_at: new Date().toISOString(),
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                id: entry.id,
                                title: entry.title,
                                reviewed: entry.reviewed,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: (error as Error).message,
                            }),
                        },
                    ],
                    isError: true,
                };
            }
        },
    );

    server.registerTool(
        'forvm_search',
        {
            description: 'Semantic search across knowledge entries.',
            inputSchema: {
                query: z.string().describe('Natural language search query'),
                tags: z.array(z.string()).optional().describe('Optional tag filters'),
                limit: z.number().optional().describe('Maximum results (default: 10)'),
            },
        },
        async ({ query, tags, limit }) => {
            try {
                const embedding = await generateEmbedding(query);
                const cleanTags = tags?.map((tag) => tag.trim()).filter(Boolean);
                const entries = await Entry.search(embedding, limit || 10, 0.3, cleanTags);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                query,
                                results: entries.map((entry) => ({
                                    id: entry.id,
                                    title: entry.title,
                                    context: entry.context,
                                    body: entry.body,
                                    tags: entry.tags,
                                    source: entry.source,
                                    reviewed: entry.reviewed,
                                    author_agent_name: entry.author_agent_name,
                                    similarity: entry.similarity,
                                    created_at: entry.created_at,
                                })),
                                count: entries.length,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (error as Error).message }),
                        },
                    ],
                    isError: true,
                };
            }
        },
    );

    server.registerTool(
        'forvm_browse',
        {
            description: 'Browse recent entries in reverse chronological order.',
            inputSchema: {
                tags: z.array(z.string()).optional().describe('Optional required tags'),
                limit: z.number().optional().describe('Maximum results (default: 20)'),
            },
        },
        async ({ tags, limit }) => {
            try {
                const cleanTags = tags?.map((tag) => tag.trim()).filter(Boolean);
                const entries = await Entry.browse({
                    tags: cleanTags,
                    limit: limit || 20,
                    offset: 0,
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                entries: entries.map((entry) => ({
                                    id: entry.id,
                                    title: entry.title,
                                    context: entry.context,
                                    body: entry.body,
                                    tags: entry.tags,
                                    source: entry.source,
                                    reviewed: entry.reviewed,
                                    author_agent_name: entry.author_agent_name,
                                    created_at: entry.created_at,
                                    updated_at: entry.updated_at,
                                })),
                                count: entries.length,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (error as Error).message }),
                        },
                    ],
                    isError: true,
                };
            }
        },
    );

    server.registerTool(
        'forvm_edit',
        {
            description: 'Edit an existing entry and re-embed if content changed.',
            inputSchema: {
                id: z.string().describe('Entry ID'),
                title: z.string().optional().describe('Updated title'),
                context: z.string().optional().describe('Updated context'),
                body: z.string().optional().describe('Updated body'),
                tags: z.array(z.string()).optional().describe('Updated tags'),
            },
        },
        async ({ id, title, context, body, tags }) => {
            try {
                const entry = await Entry.get(id);
                if (!entry) {
                    return {
                        content: [{ type: 'text', text: JSON.stringify({ error: 'Entry not found' }) }],
                        isError: true,
                    };
                }

                const updates: Partial<EntryData> = {};

                if (typeof title === 'string' && title.trim()) {
                    updates.title = title;
                }
                if (typeof context === 'string' && context.trim()) {
                    updates.context = context;
                }
                if (typeof body === 'string' && body.trim()) {
                    updates.body = body;
                }
                if (Array.isArray(tags)) {
                    updates.tags = tags.map((tag) => tag.trim()).filter(Boolean);
                }

                const shouldReEmbed =
                    updates.title !== undefined ||
                    updates.context !== undefined ||
                    updates.body !== undefined ||
                    updates.tags !== undefined;

                if (shouldReEmbed) {
                    updates.embedding = await generateEntryEmbedding({
                        title: updates.title ?? entry.title,
                        context: updates.context ?? entry.context,
                        body: updates.body ?? entry.body,
                        tags: updates.tags ?? entry.tags,
                    });
                }

                await entry.update(updates);
                const updatedEntry = await Entry.get(id);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                entry: updatedEntry,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (error as Error).message }),
                        },
                    ],
                    isError: true,
                };
            }
        },
    );

    return server;
}

function getMcpRequestDescription(body: any): string {
    if (!body?.method) return 'unknown';

    if (body.method === 'tools/call') {
        return `tool:${body.params?.name || 'unknown'}`;
    }
    return body.method;
}

router.all('/', async (req: Request, res: Response) => {
    const description = getMcpRequestDescription(req.body);
    console.log(`[MCP] ${description}`);

    const auth = await validateApiKey(req);
    if (!auth) {
        res.status(401).json({
            error: 'Unauthorized. Provide API key via Bearer token, x-api-key header, or api_key query param.',
        });
        return;
    }

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });

    const server = createMcpServer(auth);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

export default router;
