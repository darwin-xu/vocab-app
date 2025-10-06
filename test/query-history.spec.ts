import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';
import { env } from 'cloudflare:test';
import {
    createTestUser,
    createAuthenticatedRequest,
    initializeTestDatabase,
} from './helpers/test-utils';

describe('Query History API', () => {
    let userToken: string;
    let userId: number;

    beforeAll(async () => {
        // Initialize database schema
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        // Clean up test data but leave users alone - each test creates its own user with a unique username
        const user = await createTestUser(`testuser${Date.now()}`, 'password');
        userToken = user.token;
        userId = user.id;

        // Add a word to vocab
        await env.DB.prepare(
            'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
        )
            .bind(userId, 'test', '2025-01-01')
            .run();
    });

    describe('POST /query-history', () => {
        it('should record definition query', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: 'test',
                        query_type: 'definition',
                    }),
                },
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(200);

            // Verify it was recorded in database
            const result = await env.DB.prepare(
                'SELECT * FROM query_history WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'test')
                .first();

            expect(result).toBeDefined();
            expect((result as { query_type: string }).query_type).toBe(
                'definition',
            );
        });

        it('should record TTS query', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: 'test',
                        query_type: 'tts',
                    }),
                },
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(200);

            // Verify it was recorded in database
            const result = await env.DB.prepare(
                'SELECT * FROM query_history WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'test')
                .first();

            expect(result).toBeDefined();
            expect((result as { query_type: string }).query_type).toBe('tts');
        });

        it('should reject invalid query_type', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: 'test',
                        query_type: 'invalid',
                    }),
                },
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(400);
            expect(await response.text()).toContain('Invalid query_type');
        });

        it('should require authentication', async () => {
            const request = new Request('http://example.com/query-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: 'test',
                    query_type: 'definition',
                }),
            });

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(401);
        });
    });

    describe('GET /query-history', () => {
        beforeEach(async () => {
            // Add some query history
            await env.DB.prepare(
                'INSERT INTO query_history (user_id, word, query_type, query_time) VALUES (?, ?, ?, ?)',
            )
                .bind(userId, 'test', 'definition', '2025-01-01T10:00:00Z')
                .run();

            await env.DB.prepare(
                'INSERT INTO query_history (user_id, word, query_type, query_time) VALUES (?, ?, ?, ?)',
            )
                .bind(userId, 'test', 'tts', '2025-01-01T11:00:00Z')
                .run();

            await env.DB.prepare(
                'INSERT INTO query_history (user_id, word, query_type, query_time) VALUES (?, ?, ?, ?)',
            )
                .bind(userId, 'test', 'definition', '2025-01-01T12:00:00Z')
                .run();
        });

        it('should fetch query history for a word', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history?word=test',
                userToken,
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                history: Array<{ query_type: string; query_time: string }>;
            };

            expect(data.history).toHaveLength(3);
            // Should be ordered by query_time DESC
            expect(data.history[0].query_time).toBe('2025-01-01T12:00:00Z');
            expect(data.history[0].query_type).toBe('definition');
            expect(data.history[1].query_time).toBe('2025-01-01T11:00:00Z');
            expect(data.history[1].query_type).toBe('tts');
        });

        it('should return empty history for word with no queries', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history?word=nonexistent',
                userToken,
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                history: Array<{ query_type: string; query_time: string }>;
            };

            expect(data.history).toHaveLength(0);
        });

        it('should require word parameter', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/query-history',
                userToken,
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(400);
            expect(await response.text()).toContain('Missing word parameter');
        });

        it('should require authentication', async () => {
            const request = new Request(
                'http://example.com/query-history?word=test',
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(401);
        });

        it('should only return history for authenticated user', async () => {
            // Create another user
            const otherUser = await createTestUser(
                `otheruser${Date.now()}`,
                'password',
            );

            // Add history for the other user
            await env.DB.prepare(
                'INSERT INTO query_history (user_id, word, query_type, query_time) VALUES (?, ?, ?, ?)',
            )
                .bind(
                    otherUser.id,
                    'test',
                    'definition',
                    '2025-01-01T13:00:00Z',
                )
                .run();

            // Request with first user's token
            const request = createAuthenticatedRequest(
                'http://example.com/query-history?word=test',
                userToken,
            );

            const response = await worker.fetch(request, env);
            expect(response.status).toBe(200);

            const data = (await response.json()) as {
                history: Array<{ query_type: string; query_time: string }>;
            };

            // Should only return the first user's history (3 items), not the other user's
            expect(data.history).toHaveLength(3);
            expect(
                data.history.every(
                    (h) => h.query_time !== '2025-01-01T13:00:00Z',
                ),
            ).toBe(true);
        });
    });
});
