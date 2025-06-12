import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
    // Global ignores
    {
        ignores: [
            '**/dist/**', // Ignore all dist folders
            '**/node_modules/**', // Ignore all node_modules folders
            '.wrangler/**', // Ignore wrangler output
            // Add other generated/output folders if any, e.g., coverage reports
            // '**/coverage/**',
        ],
    },

    // Global rules applied to all files
    {
        rules: {
            indent: [
                'error',
                4,
                {
                    SwitchCase: 1,
                    VariableDeclarator: 1,
                    outerIIFEBody: 1,
                    MemberExpression: 1,
                    FunctionDeclaration: { parameters: 1, body: 1 },
                    FunctionExpression: { parameters: 1, body: 1 },
                    CallExpression: { arguments: 1 },
                    ArrayExpression: 1,
                    ObjectExpression: 1,
                    ImportDeclaration: 1,
                    flatTernaryExpressions: false,
                    ignoreComments: false,
                },
            ],
        },
    },

    // Base JS recommended rules (applies to .js, .mjs, .cjs files found)
    js.configs.recommended,

    // Base TS recommended rules (applies to .ts, .mts, .cts, .tsx files found)
    // These are general; specific configurations below will refine them.
    ...tseslint.configs.recommended,

    // Configuration for client-side React code (files in client/src)
    {
        files: ['client/src/**/*.{ts,tsx}'],
        languageOptions: {
            // ecmaVersion is usually handled by js.configs.recommended or tseslint.configs.recommended
            globals: {
                ...globals.browser, // Standard browser globals
            },
            parserOptions: {
                project: [
                    './client/tsconfig.json',
                    './client/tsconfig.app.json',
                    './client/tsconfig.node.json',
                ],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            // Rules from the original client ESLint configuration
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            // If tseslint.configs.recommended has rules conflicting with React/browser, they can be adjusted here.
        },
    },

    // Configuration for root-level TypeScript code (backend, tests, TS config files)
    {
        files: [
            'src/**/*.ts', // For Cloudflare worker code in the root src/
            'test/**/*.ts', // For tests in the root test/
            '*.config.ts', // For .ts config files at the root (if any)
        ],
        languageOptions: {
            globals: {
                ...globals.node, // Standard Node.js globals (useful for tests and config files)
                // For Cloudflare Worker specific globals in 'src/**/*.ts':
                // If 'globals.node' is not sufficient, you might need to add them manually
                // or use a plugin like 'eslint-plugin-cloudflare-workers' if available.
                // Example: 'MY_KV_NAMESPACE': 'readonly', 'MY_VARIABLE': 'readonly',
            },
            parserOptions: {
                project: ['./tsconfig.json', './test/tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Add any specific rules for backend/test code here.
            // For example, if 'no-undef' complains about Cloudflare Worker globals,
            // define them in 'globals' above or use an appropriate ESLint plugin.
        },
    },

    // Configuration for vitest.config.mts (treated separately due to module resolution issues)
    {
        files: ['vitest.config.mts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // Disable TypeScript-specific rules that might cause issues
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
        },
    },

    // Optional: Configuration for root-level JavaScript config files (if any and needing specific handling)
    // These files will inherit js.configs.recommended from the top.
    {
        files: ['*.config.js', '*.config.mjs'], // E.g. if you add a root postcss.config.js
        languageOptions: {
            globals: {
                ...globals.node, // Node.js globals for JS config files
            },
        },
        // No typescript-eslint specific parserOptions needed here if these are plain JS.
    },

    // Prettier config - must be last to override conflicting rules
    prettier,
);
