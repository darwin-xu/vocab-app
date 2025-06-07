// Test setup for Cloudflare Workers tests
// Helpers for setting up the database used in tests

// Schema SQL as a string

// Global test setup function
import type { D1Database } from '@cloudflare/workers-types';

interface Env {
    DB: D1Database;
}

export async function setupDatabase(env: Env) {
    // Execute each table creation separately
    try {
        await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        custom_instructions TEXT DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

        await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS vocab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        word TEXT NOT NULL,
        add_date TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    } catch (error: unknown) {
        console.warn('Error setting up database:', (error as Error).message);
    }
}

// Setup function to be called in each test file
export async function setupTestEnvironment(env: Env) {
    await setupDatabase(env);
}
