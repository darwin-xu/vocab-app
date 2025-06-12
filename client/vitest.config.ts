import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
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
