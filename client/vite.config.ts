import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = new Date().toISOString();
const processEnv =
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env ?? {};
const buildDate = new Date(buildTime);
const versionDate = [
    buildDate.getFullYear(),
    String(buildDate.getMonth() + 1).padStart(2, '0'),
    String(buildDate.getDate()).padStart(2, '0'),
].join('.');
const buildNumber =
    processEnv.BUILD_NUMBER ??
    [
        buildDate.getFullYear(),
        String(buildDate.getMonth() + 1).padStart(2, '0'),
        String(buildDate.getDate()).padStart(2, '0'),
        String(buildDate.getHours()).padStart(2, '0'),
        String(buildDate.getMinutes()).padStart(2, '0'),
    ].join('');
const deployedDate = buildTime.slice(0, 10);

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION_DATE__: JSON.stringify(versionDate),
        __APP_BUILD_NUMBER__: JSON.stringify(buildNumber),
        __APP_DEPLOY_DATE__: JSON.stringify(deployedDate),
    },
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
            '/word-image': {
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
