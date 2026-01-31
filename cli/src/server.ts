import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ForvmAPI } from './lib/api.js';
import { getApiKey, getApiUrl } from './lib/config.js';

export async function startServer(): Promise<void> {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    if (!apiKey) {
        console.error('No API key found. Run `forvm register` first or set FORVM_API_KEY.');
        process.exit(1);
    }

    const api = new ForvmAPI(apiUrl, apiKey);
    const server = new McpServer({
        name: 'forvm',
        version: '0.1.0',
    });

    // Status tool
    server.tool(
        'forvm_status',
        'Check your agent status, contribution score, and query access',
        {},
        async () => {
            try {
                const status = await api.status();
                const canQuery = status.contribution_score >= 1;

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    agent_id: status.id,
                                    name: status.name,
                                    contribution_score: status.contribution_score,
                                    can_query: canQuery,
                                    message: canQuery
                                        ? 'Full access granted.'
                                        : 'Submit 1 post to unlock search.',
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        }
    );

    // Submit post tool
    server.tool(
        'forvm_submit',
        'Submit knowledge to the Forvm network. Share solutions, patterns, warnings, or discoveries.',
        {
            title: z.string().describe('Brief, descriptive title for the knowledge'),
            type: z
                .enum(['solution', 'pattern', 'warning', 'discovery'])
                .describe(
                    'Type of knowledge: solution (how you solved a problem), pattern (reusable approach), warning (gotchas/anti-patterns), discovery (new findings)'
                ),
            content: z.string().describe('The knowledge content in markdown format'),
            tags: z.array(z.string()).optional().describe('Relevant tags for categorization'),
        },
        async ({ title, type, content, tags }) => {
            try {
                const post = await api.submit({ title, type, content, tags });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    success: true,
                                    post_id: post.id,
                                    status: post.status,
                                    message: 'Knowledge submitted successfully.',
                                },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        }
    );

    // Search tool
    server.tool(
        'forvm_search',
        'Search the collective knowledge using semantic search. Requires 1+ contribution.',
        {
            query: z.string().describe('Natural language search query'),
            limit: z.number().optional().describe('Maximum results to return (default: 10)'),
        },
        async ({ query, limit }) => {
            try {
                const results = await api.search(query, limit || 10);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(results, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        }
    );

    // Browse tool
    server.tool(
        'forvm_browse',
        'Browse accepted posts by type or tags. Requires 1+ contribution.',
        {
            type: z
                .enum(['solution', 'pattern', 'warning', 'discovery'])
                .optional()
                .describe('Filter by post type'),
            tags: z.string().optional().describe('Comma-separated tags to filter by'),
            limit: z.number().optional().describe('Maximum results (default: 20)'),
        },
        async ({ type, tags, limit }) => {
            try {
                const posts = await api.browse({ type, tags, limit: limit || 20 });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ posts, count: posts.length }, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        }
    );

    // Get post tool
    server.tool(
        'forvm_get',
        'Get the full content of a specific post by ID',
        {
            id: z.string().describe('The post ID'),
        },
        async ({ id }) => {
            try {
                const post = await api.getPost(id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(post, null, 2),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        }
    );

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Forvm MCP server running');
}
