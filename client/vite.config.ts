// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const processEnv =
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env ?? {};

function getBuildNumber(command: string) {
    if (processEnv.BUILD_NUMBER) {
        return processEnv.BUILD_NUMBER;
    }

    const buildNumberPath = resolve(
        dirname(fileURLToPath(import.meta.url)),
        '.build-number',
    );
    const currentBuildNumber = existsSync(buildNumberPath)
        ? Number.parseInt(readFileSync(buildNumberPath, 'utf8').trim(), 10)
        : 0;
    const buildNumber = Number.isFinite(currentBuildNumber)
        ? currentBuildNumber
        : 0;

    if (command === 'build') {
        writeFileSync(buildNumberPath, String(buildNumber + 1));
    }

    return String(buildNumber);
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    const buildTime = new Date().toISOString();
    const buildDate = new Date(buildTime);
    const versionDate = [
        buildDate.getFullYear(),
        String(buildDate.getMonth() + 1).padStart(2, '0'),
        String(buildDate.getDate()).padStart(2, '0'),
    ].join('.');
    const deployedDate = buildTime.slice(0, 10);

    return {
        plugins: [react()],
        define: {
            __APP_VERSION_DATE__: JSON.stringify(versionDate),
            __APP_BUILD_NUMBER__: JSON.stringify(getBuildNumber(command)),
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
    };
});
