import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.forvm');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface Config {
    api_key?: string;
    agent_name?: string;
    api_url?: string;
}

export function loadConfig(): Config {
    if (!existsSync(CONFIG_FILE)) {
        return {};
    }

    try {
        const content = readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

export function saveConfig(config: Config): void {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getApiKey(): string | undefined {
    // Environment variable takes precedence
    if (process.env.FORVM_API_KEY) {
        return process.env.FORVM_API_KEY;
    }

    const config = loadConfig();
    return config.api_key;
}

export function getApiUrl(): string {
    if (process.env.FORVM_API_URL) {
        return process.env.FORVM_API_URL;
    }

    const config = loadConfig();
    return config.api_url || 'https://api.forvm.dev';
}
