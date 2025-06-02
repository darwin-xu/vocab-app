// Test setup for Cloudflare Workers tests
import { readFileSync } from 'fs';
import { join } from 'path';

// Schema SQL as a string
const schemaSQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  custom_instructions TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vocab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  word TEXT NOT NULL,
  add_date TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

// Global test setup function
export async function setupDatabase(env: any) {
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
    } catch (error: any) {
        console.warn('Error setting up database:', error.message);
    }
}

// Setup function to be called in each test file
export async function setupTestEnvironment(env: any) {
    await setupDatabase(env);
}
