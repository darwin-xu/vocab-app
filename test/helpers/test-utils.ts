// test/helpers/test-utils.ts
import { env } from 'cloudflare:test';
import { expect } from 'vitest';
import worker from '../../src/index';
import { setupTestEnvironment } from '../setup';

// Types for test data
export interface TestUser {
    id: number;
    username: string;
    password: string;
    token: string;
    isAdmin: boolean;
}

export interface TestVocabItem {
    word: string;
    add_date: string;
    user_id?: number;
}

interface LoginResponse {
    token: string;
    is_admin: boolean;
}

interface D1QueryResult {
    id: number;
}

interface D1VocabResult {
    word: string;
    user_id: number;
}

interface D1UserResult {
    id: number;
    username: string;
    custom_instructions: string | null;
}

// Initialize test database
export async function initializeTestDatabase(): Promise<void> {
    await setupTestEnvironment(env);
}

/**
 * Creates an authenticated request with proper headers
 */
export function createAuthenticatedRequest(url: string, token: string, options: RequestInit = {}): Request {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new Request(url, { ...options, headers });
}

/**
 * Creates a user in the database and returns user info with auth token
 */
export async function createTestUser(
    username: string,
    password: string,
    isAdmin = false
): Promise<TestUser> {
    // Insert user directly into database
    const result = await env.DB.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?) RETURNING id')
        .bind(username, password, isAdmin ? 1 : 0)
        .first() as D1QueryResult | null;
    
    if (!result) {
        throw new Error('Failed to create test user');
    }

    // Login to get token
    const loginRequest = new Request('http://example.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const response = await worker.fetch(loginRequest, env);
    const data = await response.json() as LoginResponse;

    return {
        id: result.id,
        username,
        password,
        token: data.token,
        isAdmin: data.is_admin
    };
}

/**
 * Asserts that a response contains JSON with expected properties
 */
export async function assertJsonResponse<T extends Record<string, unknown>>(
    response: Response,
    expectedStatus: number,
    expectedProperties?: Partial<T>
): Promise<T> {
    expect(response.status).toBe(expectedStatus);
    const json = await response.json() as T;

    if (expectedProperties) {
        for (const [key, value] of Object.entries(expectedProperties)) {
            expect(json[key]).toBe(value);
        }
    }

    return json;
}

/**
 * Asserts that a vocabulary item exists in the database
 */
export async function assertVocabExists(
    userId: number,
    word: string
): Promise<void> {
    const vocab = await env.DB.prepare('SELECT * FROM vocab WHERE user_id = ? AND word = ?')
        .bind(userId, word)
        .first() as D1VocabResult | null;

    expect(vocab).not.toBeNull();
    if (!vocab) return;

    expect(vocab.word).toBe(word);
    expect(vocab.user_id).toBe(userId);
}

/**
 * Asserts that a user exists in the database
 */
export async function assertUserExists(
    username: string
): Promise<void> {
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
        .bind(username)
        .first() as D1UserResult | null;

    expect(user).not.toBeNull();
    if (!user) return;

    expect(user.username).toBe(username);
}
