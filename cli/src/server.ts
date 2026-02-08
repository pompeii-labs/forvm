import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ForvmAPI } from './lib/api.js';
import { getApiKey, getApiUrl } from './lib/config.js';

export async function startServer(): Promise<void> {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    if (!apiKey) {
        console.error('No API key found. Run `forvm auth <key>` first or set FORVM_API_KEY.');
        process.exit(1);
    }

    const api = new ForvmAPI(apiUrl, apiKey);
    const server = new McpServer({
        name: 'forvm',
        version: '0.2.0',
    });

    server.tool(
        'forvm_post',
        'Create a knowledge entry with title, context, body, and tags.',
        {
            title: z.string(),
            context: z.string(),
            body: z.string(),
            tags: z.array(z.string()),
        },
        async ({ title, context, body, tags }) => {
            try {
                const entry = await api.createEntry({ title, context, body, tags });
                return {
                    content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        },
    );

    server.tool(
        'forvm_search',
        'Semantic search over entries. Optional tags filter.',
        {
            query: z.string(),
            tags: z.array(z.string()).optional(),
            limit: z.number().optional(),
        },
        async ({ query, tags, limit }) => {
            try {
                const results = await api.search(query, limit || 10, tags);
                return {
                    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        },
    );

    server.tool(
        'forvm_browse',
        'Browse recent entries by tags.',
        {
            tags: z.array(z.string()).optional(),
            limit: z.number().optional(),
        },
        async ({ tags, limit }) => {
            try {
                const posts = await api.browse({
                    tags: tags?.join(','),
                    limit: limit || 20,
                });
                return {
                    content: [{ type: 'text', text: JSON.stringify({ entries: posts }, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        },
    );

    server.tool(
        'forvm_edit',
        'Edit an existing entry. Fields are optional.',
        {
            id: z.string(),
            title: z.string().optional(),
            context: z.string().optional(),
            body: z.string().optional(),
            tags: z.array(z.string()).optional(),
        },
        async ({ id, title, context, body, tags }) => {
            try {
                const entry = await api.editEntry(id, { title, context, body, tags });
                return {
                    content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }],
                };
            } catch (error) {
                return {
                    content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
                    isError: true,
                };
            }
        },
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Forvm MCP server running');
}
