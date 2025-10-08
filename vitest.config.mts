import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
    test: {
        include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['client/**/*'],
        poolOptions: {
            workers: {
                wrangler: { configPath: './wrangler.toml' },
            },
        },
        restoreMocks: true,
        clearMocks: true,
        unstubEnvs: true,
        unstubGlobals: true,
        forceRerunTriggers: [],
        coverage: {
            provider: 'istanbul',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'test/**',
                'dist/**',
                '**/*.d.ts',
                '**/node_modules/**',
                'client/**',
            ],
            include: ['src/**/*.ts'],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
});
