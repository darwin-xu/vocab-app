import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // Proxy all API endpoints to the Wrangler backend
            '/login': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/register': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/vocab': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/add': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/remove': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/word': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/openai': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/notes': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/tts': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            '/query-history': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            // Admin endpoints
            '/admin': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
            // Profile endpoints
            '/profile': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
});
