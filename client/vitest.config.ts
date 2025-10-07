import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const env = (
    globalThis as {
        process?: { env?: Record<string, string | undefined> };
    }
).process?.env;

const buildTime = env?.VITEST_APP_BUILD_TIME ?? new Date().toISOString();
const packageVersion = env?.npm_package_version ?? 'test';

export default defineConfig({
    plugins: [react()],
    define: {
        __APP_VERSION__: JSON.stringify(packageVersion),
        __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        restoreMocks: true,
        clearMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'src/test/**',
                'dist/**',
                '**/*.d.ts',
                '**/node_modules/**',
                'src/vite-env.d.ts',
                'src/main.tsx',
            ],
            include: ['src/**/*.{ts,tsx}'],
            thresholds: {
                global: {
                    branches: 75,
                    functions: 75,
                    lines: 75,
                    statements: 75,
                },
            },
        },
    },
});
