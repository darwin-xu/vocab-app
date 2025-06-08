// test/helpers/test-utils.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
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

export async function createTestUsers(users: Array<{ username: string; password: string; isAdmin?: boolean }>): Promise<TestUser[]> {
    const createdUsers: TestUser[] = [];
    for (const user of users) {
        const testUser = await createTestUser(user.username, user.password, user.isAdmin || false);
        createdUsers.push(testUser);
    }
    return createdUsers;
}

export async function addTestVocab(userId: number, vocabItems: TestVocabItem[]): Promise<void> {
    for (const item of vocabItems) {
        await env.DB.prepare('INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)')
            .bind(userId, item.word, item.add_date).run();
    }
}

export async function cleanupDatabase(): Promise<void> {
    await env.DB.prepare('DELETE FROM vocab').run();
    await env.DB.prepare('DELETE FROM users').run();
}

export async function makeAuthenticatedRequest(
    url: string,
    token: string,
    options: RequestInit = {}
): Promise<Response> {
    const request = createAuthenticatedRequest(url, token, options);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    return response;
}

export async function assertResponse(
    response: Response,
    expectedStatus: number,
    expectedText?: string
): Promise<void> {
    expect(response.status).toBe(expectedStatus);
    if (expectedText !== undefined) {
        const text = await response.text();
        expect(text).toBe(expectedText);
    }
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

export class DatabaseValidator {
    static async assertUserExists(username: string, shouldExist = true) {
        const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
            .bind(username).first();

        if (shouldExist) {
            expect(user).toBeTruthy();
            expect(user.username).toBe(username);
        } else {
            expect(user).toBeNull();
        }

        return user;
    }

    static async assertVocabExists(userId: number, word: string, shouldExist = true) {
        const vocab = await env.DB.prepare('SELECT * FROM vocab WHERE user_id = ? AND word = ?')
            .bind(userId, word).first();

        if (shouldExist) {
            expect(vocab).toBeTruthy();
            expect(vocab.word).toBe(word);
            expect(vocab.user_id).toBe(userId);
        } else {
            expect(vocab).toBeNull();
        }

        return vocab;
    }

    static async assertVocabCount(userId: number, expectedCount: number) {
        const result = await env.DB.prepare('SELECT COUNT(*) as count FROM vocab WHERE user_id = ?')
            .bind(userId).first();

        expect(result.count).toBe(expectedCount);
    }

    static async assertUserInstructions(userId: number, expectedInstructions: string | null) {
        const user = await env.DB.prepare('SELECT custom_instructions FROM users WHERE id = ?')
            .bind(userId).first();

        expect(user.custom_instructions).toBe(expectedInstructions);
    }
}
