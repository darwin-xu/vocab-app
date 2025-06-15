// test/notes.spec.ts
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

describe('Notes endpoints', () => {
    let userToken: string;
    let userId: number;

    beforeAll(async () => {
        // Initialize database schema
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        // Clean up database
        await env.DB.prepare('DELETE FROM notes').run();
        await env.DB.prepare('DELETE FROM vocab').run();
        await env.DB.prepare('DELETE FROM users').run();

        // Create test user and get token
        const user = await createUserAndGetToken('testuser', 'testpass');
        userToken = user.token;
        userId = user.userId;

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
    });

    describe('GET /notes', () => {
        beforeEach(async () => {
            // Add a test note
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    userId,
                    'hello',
                    'This is a test note',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();
        });

        it('should fetch note for a word', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes?word=hello',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            const data = (await response.json()) as { note: string };
            expect(data.note).toBe('This is a test note');
        });

        it('should return null for word without note', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes?word=world',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            const data = (await response.json()) as { note: string | null };
            expect(data.note).toBeNull();
        });

        it('should require word parameter', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe('Missing word parameter');
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/notes?word=hello');

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it("should only return user's own notes", async () => {
            // Create another user with a note
            const otherUser = await createUserAndGetToken(
                'otheruser',
                'otherpass',
            );
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    otherUser.userId,
                    'hello',
                    'Other user note',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/notes?word=hello',
                userToken,
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            const data = (await response.json()) as { note: string };
            expect(data.note).toBe('This is a test note'); // Should get current user's note
        });
    });

    describe('POST /notes', () => {
        it('should create new note', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: 'hello',
                        note: 'New test note',
                    }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify note was created in database
            const note = (await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'hello')
                .first()) as { note: string } | null;
            expect(note).toBeTruthy();
            expect(note?.note).toBe('New test note');
        });

        it('should update existing note', async () => {
            // Create initial note
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    userId,
                    'hello',
                    'Original note',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word: 'hello',
                        note: 'Updated note',
                    }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify note was updated
            const note = (await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'hello')
                .first()) as { note: string } | null;
            expect(note?.note).toBe('Updated note');

            // Verify only one note exists for this word
            const count = (await env.DB.prepare(
                'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'hello')
                .first()) as { count: number };
            expect(count.count).toBe(1);
        });

        it('should require word field and handle empty notes as deletion', async () => {
            // Test missing word (should fail)
            const request1 = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note: 'test note' }),
                },
            );

            const response1 = await worker.fetch(request1, env);
            expect(response1.status).toBe(400);
            expect(await response1.text()).toBe('Missing word');

            // Test word with empty note (should succeed and delete any existing note)
            const request2 = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'hello' }),
                },
            );

            const response2 = await worker.fetch(request2, env);
            expect(response2.status).toBe(200);
            expect(await response2.text()).toBe('OK');

            // Test word with blank note (should also succeed and delete)
            const request3 = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'hello', note: '   ' }),
                },
            );

            const response3 = await worker.fetch(request3, env);
            expect(response3.status).toBe(200);
            expect(await response3.text()).toBe('OK');
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: 'hello', note: 'test note' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });
    });

    describe('DELETE /notes', () => {
        beforeEach(async () => {
            // Add test notes
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    userId,
                    'hello',
                    'Note to delete',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    userId,
                    'world',
                    'Keep this note',
                    '2025-01-02',
                    '2025-01-02',
                )
                .run();
        });

        it('should delete note for specified word', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'hello' }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify note was deleted
            const note = await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'hello')
                .first();
            expect(note).toBeNull();

            // Verify other note still exists
            const otherNote = await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'world')
                .first();
            expect(otherNote).toBeTruthy();
        });

        it('should require word field', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe('Missing word');
        });

        it('should handle deleting non-existent note gracefully', async () => {
            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'nonexistent' }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/notes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: 'hello' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it("should only delete user's own notes", async () => {
            // Create another user with the same word
            const otherUser = await createUserAndGetToken(
                'otheruser',
                'otherpass',
            );
            await env.DB.prepare(
                'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
                .bind(
                    otherUser.userId,
                    'hello',
                    'Other user note',
                    '2025-01-01',
                    '2025-01-01',
                )
                .run();

            const request = createAuthenticatedRequest(
                'http://example.com/notes',
                userToken,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: 'hello' }),
                },
            );

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            // Verify current user's note was deleted
            const currentUserNote = await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(userId, 'hello')
                .first();
            expect(currentUserNote).toBeNull();

            // Verify other user's note still exists
            const otherUserNote = await env.DB.prepare(
                'SELECT note FROM notes WHERE user_id = ? AND word = ?',
            )
                .bind(otherUser.userId, 'hello')
                .first();
            expect(otherUserNote).toBeTruthy();
        });
    });
});
