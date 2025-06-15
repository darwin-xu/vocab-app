// Test setup for Cloudflare Workers tests
import type { Env } from '../src/types';

// Global test setup function
export async function setupDatabase(env: Env): Promise<void> {
    try {
        await env.DB.prepare(
            `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                custom_instructions TEXT DEFAULT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `,
        ).run();

        await env.DB.prepare(
            `
            CREATE TABLE IF NOT EXISTS vocab (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                word TEXT NOT NULL,
                add_date TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `,
        ).run();

        await env.DB.prepare(
            `
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                word TEXT NOT NULL,
                note TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, word)
            )
        `,
        ).run();
    } catch (error) {
        console.warn(
            'Error setting up database:',
            error instanceof Error ? error.message : String(error),
        );
    }
}

// Setup function to be called in each test file
export async function setupTestEnvironment(env: Env): Promise<void> {
    await setupDatabase(env);
}
