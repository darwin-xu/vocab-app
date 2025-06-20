// test/vocab.spec.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';
import { initializeTestDatabase } from './helpers/test-utils';

// Helper function to create authenticated request
function createAuthenticatedRequest(
    url: string,
    token: string,
    options: RequestInit = {},
) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new Request(url, { ...options, headers });
}

// Helper function to create user and get token
async function createUserAndGetToken(
    username: string,
    password: string,
    isAdmin = false,
) {
    // Insert user directly into database
    const result = (await env.DB.prepare(
        'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?) RETURNING id',
    )
        .bind(username, password, isAdmin ? 1 : 0)
        .first()) as { id: number } | null;

    if (!result) {
        throw new Error('Failed to create user');
    }

    // Login to get token
    const loginRequest = new Request('http://example.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const response = await worker.fetch(loginRequest, env);
    const data = (await response.json()) as { token: string };
    return { token: data.token, userId: result.id };
}

describe('Vocabulary endpoints', () => {
    let userToken: string;
    let userId: number;

    beforeAll(async () => {
        // Initialize database schema
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        // Clean up database
        await env.DB.prepare('DELETE FROM vocab').run();
        await env.DB.prepare('DELETE FROM users').run();

        // Create test user and get token
        const user = await createUserAndGetToken('testuser', 'testpass');
        userToken = user.token;
        userId = user.userId;
    });

    describe('GET /vocab', () => {
        beforeEach(async () => {
            // Add some test vocabulary
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'hello', '2025-01-01')
                .run();
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'world', '2025-01-02')
                .run();
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'vocabulary', '2025-01-03')
                .run();
        });

        it('should fetch vocabulary for authenticated user', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                items: Array<{ word: string }>;
            };
            expect(data.items).toHaveLength(3);
            expect(data.items.map((item) => item.word)).toContain('hello');
            expect(data.items.map((item) => item.word)).toContain('world');
            expect(data.items.map((item) => item.word)).toContain('vocabulary');
        });

        it('should filter vocabulary by search query', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab?q=hello',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                items: Array<{ word: string }>;
            };
            expect(data.items).toHaveLength(1);
            expect(data.items[0].word).toBe('hello');
        });

        it('should handle pagination', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab?page=1&pageSize=2',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                items: Array<{ word: string }>;
                currentPage: number;
                totalPages: number;
            };
            expect(data.items).toHaveLength(2);
            expect(data.currentPage).toBe(1);
            expect(data.totalPages).toBe(2);
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/vocab');

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it("should only return user's own vocabulary", async () => {
            // Create another user with vocabulary
            const otherUser = await createUserAndGetToken(
                'otheruser',
                'otherpass',
            );
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(otherUser.userId, 'other', '2025-01-04')
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                items: Array<{ word: string }>;
            };
            expect(data.items).toHaveLength(3);
            expect(data.items.map((item) => item.word)).not.toContain('other');
        });

        it('should include notes in vocabulary response', async () => {
            // Add a note for one of the words
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    userId,
                    'hello',
                    'Test note for hello',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                items: Array<{ word: string; note: string | null }>;
            };
            expect(data.items).toHaveLength(3);

            const helloItem = data.items.find((item) => item.word === 'hello');
            const worldItem = data.items.find((item) => item.word === 'world');
            const vocabItem = data.items.find(
                (item) => item.word === 'vocabulary',
            );

            expect(helloItem?.note).toBe('Test note for hello');
            expect(worldItem?.note).toBeNull();
            expect(vocabItem?.note).toBeNull();
        });
    });

    describe('POST /vocab', () => {
        it('should add new vocabulary word', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'newword' }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify word was added to database
            const vocab = (await env.DB.prepare(
                'SELECT * FROM vocab WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'newword')
                .first()) as {
                word: string;
            } | null;
            expect(vocab).toBeTruthy();
            expect(vocab?.word).toBe('newword');
        });

        it('should reject adding word without authentication', async () => {
            const request = new Request('http://example.com/vocab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: 'newword' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should reject adding word without word field', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe('Missing word');
        });
    });

    describe('DELETE /vocab', () => {
        beforeEach(async () => {
            // Add test vocabulary
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'delete1', '2025-01-01')
                .run();
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'delete2', '2025-01-02')
                .run();
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(userId, 'keep', '2025-01-03')
                .run();
        });

        it('should delete selected vocabulary words', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ words: ['delete1', 'delete2'] }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify words were deleted
            const remainingVocab = await env.DB.prepare(
                'SELECT word FROM vocab WHERE user_id = ?',
            )
                .bind(userId)
                .all();
            expect(remainingVocab.results).toHaveLength(1);
            expect((remainingVocab.results[0] as { word: string }).word).toBe(
                'keep',
            );
        });

        it('should reject deletion without authentication', async () => {
            const request = new Request('http://example.com/vocab', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: ['delete1'] }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it("should only delete user's own vocabulary", async () => {
            // Create another user with vocabulary
            const otherUser = await createUserAndGetToken(
                'otheruser',
                'otherpass',
            );
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
            )
                .bind(otherUser.userId, 'delete1', '2025-01-04')
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/vocab',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ words: ['delete1'] }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            // Verify only current user's word was deleted
            const userVocab = await env.DB.prepare(
                'SELECT word FROM vocab WHERE user_id = ?',
            )
                .bind(userId)
                .all();
            expect(userVocab.results).toHaveLength(2); // delete1 deleted, delete2 and keep remain

            const otherUserVocab = await env.DB.prepare(
                'SELECT word FROM vocab WHERE user_id = ?',
            )
                .bind(otherUser.userId)
                .all();
            expect(otherUserVocab.results).toHaveLength(1); // Other user's word remains
        });
    });
});
