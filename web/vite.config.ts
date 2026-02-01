import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        proxy: {
            '/v1': {
                target: 'http://localhost:8613',
                changeOrigin: true,
            },
            '/mcp': {
                target: 'http://localhost:8613',
                changeOrigin: true,
            },
        },
    },
});
