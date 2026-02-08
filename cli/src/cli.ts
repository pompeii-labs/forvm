#!/usr/bin/env node

import { ForvmAPI } from './lib/api.js';
import { getApiKey, getApiUrl, loadConfig, saveConfig } from './lib/config.js';
import { startServer } from './server.js';

const VERSION = '0.2.0';

const HELP = `
forvm - Pompeii Labs private knowledge base CLI

USAGE
  forvm <command> [options]

COMMANDS
  auth <key>        Save an existing API key
  serve             Start the MCP server (for AI assistants)
  search <query>    Semantic search entries
  browse            List recent entries
  help              Show this help message

EXAMPLES
  forvm auth fvm_abc123
  forvm serve
  forvm search "supabase auth redirect mismatch"
  forvm browse

ENVIRONMENT
  FORVM_API_KEY     Your API key (or use ~/.forvm/config.json)
  FORVM_API_URL     API URL override (default: https://api.forvm.dev)
`;

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
        console.log(HELP);
        process.exit(0);
    }

    if (command === '--version' || command === '-v') {
        console.log(VERSION);
        process.exit(0);
    }

    if (command === 'serve') {
        await startServer();
        return;
    }

    if (command === 'auth') {
        const apiKey = args[1];
        if (!apiKey) {
            console.error('Usage: forvm auth <api-key>');
            console.error('Example: forvm auth fvm_abc123');
            process.exit(1);
        }

        const api = new ForvmAPI(getApiUrl(), apiKey);

        try {
            console.log('Validating API key...');
            await api.browse({ limit: 1 });

            const config = loadConfig();
            config.api_key = apiKey;
            config.api_url = getApiUrl();
            saveConfig(config);

            console.log('');
            console.log('✓ API key saved.');
            console.log('Config: ~/.forvm/config.json');
        } catch (error) {
            console.error('Error: Invalid API key or server unreachable');
            console.error(`Details: ${(error as Error).message}`);
            process.exit(1);
        }
        return;
    }

    if (command === 'search') {
        const query = args.slice(1).join(' ');
        if (!query) {
            console.error('Usage: forvm search <query>');
            process.exit(1);
        }

        const apiKey = getApiKey();
        if (!apiKey) {
            console.error('No API key found. Run `forvm auth <key>` first.');
            process.exit(1);
        }

        const api = new ForvmAPI(getApiUrl(), apiKey);

        try {
            const results = await api.search(query);

            if (results.results.length === 0) {
                console.log('No results found.');
                return;
            }

            console.log('');
            for (const entry of results.results) {
                const similarity = entry.similarity
                    ? ` (${(entry.similarity * 100).toFixed(0)}%)`
                    : '';
                console.log(`${entry.title}${similarity}`);
                console.log(`  Context: ${entry.context}`);
                console.log(
                    `  ${entry.body.slice(0, 160)}${entry.body.length > 160 ? '...' : ''}`,
                );
                console.log(`  Tags: ${entry.tags.join(', ') || 'none'}`);
                console.log(`  ID: ${entry.id}`);
                console.log('');
            }
        } catch (error) {
            console.error(`Error: ${(error as Error).message}`);
            process.exit(1);
        }
        return;
    }

    if (command === 'browse') {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.error('No API key found. Run `forvm auth <key>` first.');
            process.exit(1);
        }

        const api = new ForvmAPI(getApiUrl(), apiKey);

        try {
            const entries = await api.browse({ limit: 20 });

            if (entries.length === 0) {
                console.log('No entries found.');
                return;
            }

            console.log('');
            for (const entry of entries) {
                console.log(`${entry.title}`);
                console.log(`  Context: ${entry.context}`);
                console.log(`  Reviewed: ${entry.reviewed ? 'yes' : 'no'}`);
                console.log(`  ID: ${entry.id}`);
                console.log('');
            }
        } catch (error) {
            console.error(`Error: ${(error as Error).message}`);
            process.exit(1);
        }
        return;
    }

    console.error(`Unknown command: ${command}`);
    console.error('Run `forvm help` for usage.');
    process.exit(1);
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
