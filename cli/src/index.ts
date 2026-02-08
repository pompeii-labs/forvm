// Main exports for programmatic usage
export { ForvmAPI } from './lib/api.js';
export type { Entry, SearchResponse, CreateEntryInput } from './lib/api.js';
export { loadConfig, saveConfig, getApiKey, getApiUrl } from './lib/config.js';
export { startServer } from './server.js';
