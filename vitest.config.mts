import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
        test: {
                poolOptions: {
                        workers: {
                                wrangler: { configPath: './wrangler.toml' },
                        },
                },
                include: ['test/**/*.spec.ts'],
                restoreMocks: true,
		clearMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
		forceRerunTriggers: [],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'test/**',
				'dist/**',
				'**/*.d.ts',
				'**/node_modules/**'
			],
			include: ['src/**/*.ts'],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80
				}
			}
		}
	},
});
