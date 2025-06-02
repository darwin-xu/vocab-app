// test/helpers/test-utils.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { expect } from 'vitest';
import worker from '../../src/index';
import { setupTestEnvironment } from '../setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Initialize test database
export async function initializeTestDatabase() {
    await setupTestEnvironment(env);
}

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
}

/**
 * Creates an authenticated request with proper headers
 */
export function createAuthenticatedRequest(url: string, token: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new IncomingRequest(url, { ...options, headers });
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
        .bind(username, password, isAdmin ? 1 : 0).first();

    // Login to get token
    const loginRequest = new IncomingRequest('http://example.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(loginRequest, env, ctx);
    await waitOnExecutionContext(ctx);

    if (!response.ok) {
        throw new Error(`Failed to login test user: ${await response.text()}`);
    }

    const data = await response.json();

    return {
        id: result.id,
        username,
        password,
        token: data.token,
        isAdmin
    };
}

/**
 * Creates multiple test users at once
 */
export async function createTestUsers(users: Array<{ username: string; password: string; isAdmin?: boolean }>) {
    const createdUsers: TestUser[] = [];

    for (const user of users) {
        const testUser = await createTestUser(user.username, user.password, user.isAdmin || false);
        createdUsers.push(testUser);
    }

    return createdUsers;
}

/**
 * Adds vocabulary items for a specific user
 */
export async function addTestVocab(userId: number, vocabItems: TestVocabItem[]) {
    for (const item of vocabItems) {
        await env.DB.prepare('INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)')
            .bind(userId, item.word, item.add_date).run();
    }
}

/**
 * Cleans up all test data from the database
 */
export async function cleanupDatabase() {
    await env.DB.prepare('DELETE FROM vocab').run();
    await env.DB.prepare('DELETE FROM users').run();
}

/**
 * Makes an authenticated API request and returns the response
 */
export async function makeAuthenticatedRequest(
    url: string,
    token: string,
    options: RequestInit = {}
) {
    const request = createAuthenticatedRequest(url, token, options);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    return response;
}

/**
 * Asserts that a response has the expected status and optional body text
 */
export async function assertResponse(
    response: Response,
    expectedStatus: number,
    expectedText?: string
) {
    expect(response.status).toBe(expectedStatus);

    if (expectedText !== undefined) {
        const text = await response.text();
        expect(text).toBe(expectedText);
    }
}

/**
 * Asserts that a response contains JSON with expected properties
 */
export async function assertJsonResponse(
    response: Response,
    expectedStatus: number,
    expectedProperties?: Record<string, any>
) {
    expect(response.status).toBe(expectedStatus);

    const json = await response.json();

    if (expectedProperties) {
        for (const [key, value] of Object.entries(expectedProperties)) {
            expect(json[key]).toBe(value);
        }
    }

    return json;
}

/**
 * Creates test data setup for vocabulary tests
 */
export async function setupVocabTestData() {
    await cleanupDatabase();

    const [user1, user2, admin] = await createTestUsers([
        { username: 'user1', password: 'pass1' },
        { username: 'user2', password: 'pass2' },
        { username: 'admin', password: 'adminpass', isAdmin: true }
    ]);

    // Add vocabulary for user1
    await addTestVocab(user1.id, [
        { word: 'hello', add_date: '2025-01-01' },
        { word: 'world', add_date: '2025-01-02' },
        { word: 'vocabulary', add_date: '2025-01-03' },
        { word: 'testing', add_date: '2025-01-04' },
        { word: 'javascript', add_date: '2025-01-05' }
    ]);

    // Add vocabulary for user2
    await addTestVocab(user2.id, [
        { word: 'python', add_date: '2025-01-01' },
        { word: 'programming', add_date: '2025-01-02' }
    ]);

    return { user1, user2, admin };
}

/**
 * Creates test data setup for admin tests
 */
export async function setupAdminTestData() {
    await cleanupDatabase();

    const [regularUser, admin] = await createTestUsers([
        { username: 'regularuser', password: 'userpass' },
        { username: 'admin', password: 'adminpass', isAdmin: true }
    ]);

    // Add custom instructions to regular user
    await env.DB.prepare('UPDATE users SET custom_instructions = ? WHERE id = ?')
        .bind('Default user instructions', regularUser.id).run();

    return { regularUser, admin };
}

/**
 * Validates database state after operations
 */
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
