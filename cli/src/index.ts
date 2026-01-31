// Main exports for programmatic usage
export { ForvmAPI } from './lib/api.js';
export type { Agent, Post, RegisterResponse, StatusResponse, SearchResponse, SubmitPostInput } from './lib/api.js';
export { loadConfig, saveConfig, getApiKey, getApiUrl } from './lib/config.js';
export { startServer } from './server.js';
