// test/admin.spec.ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';
import { initializeTestDatabase } from './helpers/test-utils';

// Helper function to create authenticated request
function createAuthenticatedRequest(url: string, token: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new Request(url, { ...options, headers });
}

// Helper function to create user and get token
async function createUserAndGetToken(username: string, password: string, isAdmin = false) {
    // Insert user directly into database
    const result = (await env.DB.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?) RETURNING id')
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

describe('Admin endpoints', () => {
    let adminToken: string;
    let userToken: string;
    let regularUserId: number;

    beforeAll(async () => {
        // Initialize database schema
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        // Clean up database
        await env.DB.prepare('DELETE FROM users').run();

        // Create admin and regular user
        const admin = await createUserAndGetToken('admin', 'adminpass', true);
        const user = await createUserAndGetToken('testuser', 'testpass', false);

        adminToken = admin.token;
        userToken = user.token;
        regularUserId = user.userId;
    });

    describe('GET /admin/users', () => {
        it('should return all users for admin', async () => {
            const request = createAuthenticatedRequest('http://example.com/admin/users', adminToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const users = (await response.json()) as Array<{ username: string }>;
            expect(users).toHaveLength(2);
            expect(users.map((u) => u.username)).toContain('admin');
            expect(users.map((u) => u.username)).toContain('testuser');
        });

        it('should reject non-admin users', async () => {
            const request = createAuthenticatedRequest('http://example.com/admin/users', userToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(403);
            expect(await response.text()).toBe('Admin access required');
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/admin/users');

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });
    });

    describe('GET /admin/users/:id', () => {
        beforeEach(async () => {
            // Add custom instructions to regular user
            await env.DB.prepare('UPDATE users SET custom_instructions = ? WHERE id = ?')
                .bind('Custom instructions for user', regularUserId)
                .run();
        });

        it('should return user details for admin', async () => {
            const request = createAuthenticatedRequest(`http://example.com/admin/users/${regularUserId}`, adminToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const userDetails = (await response.json()) as { id: number; username: string; custom_instructions: string };
            expect(userDetails.id).toBe(regularUserId);
            expect(userDetails.username).toBe('testuser');
            expect(userDetails.custom_instructions).toBe('Custom instructions for user');
        });

        it('should reject non-admin users', async () => {
            const request = createAuthenticatedRequest(`http://example.com/admin/users/${regularUserId}`, userToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(403);
            expect(await response.text()).toBe('Admin access required');
        });

        it('should return 404 for non-existent user', async () => {
            const request = createAuthenticatedRequest('http://example.com/admin/users/99999', adminToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe('User not found');
        });
    });

    describe('PUT /admin/users/:id', () => {
        it('should update user instructions for admin', async () => {
            const newInstructions = 'Updated custom instructions';
            const request = createAuthenticatedRequest(`http://example.com/admin/users/${regularUserId}`, adminToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: newInstructions }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify instructions were updated
            const user = (await env.DB.prepare('SELECT custom_instructions FROM users WHERE id = ?').bind(regularUserId).first()) as { custom_instructions: string } | null;
            expect(user?.custom_instructions).toBe(newInstructions);
        });

        it('should reject non-admin users', async () => {
            const request = createAuthenticatedRequest(`http://example.com/admin/users/${regularUserId}`, userToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: 'New instructions' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(403);
            expect(await response.text()).toBe('Admin access required');
        });

        it('should return 404 for non-existent user', async () => {
            const request = createAuthenticatedRequest('http://example.com/admin/users/99999', adminToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: 'New instructions' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(404);
            expect(await response.text()).toBe('User not found');
        });

        it('should handle missing custom_instructions field', async () => {
            const request = createAuthenticatedRequest(`http://example.com/admin/users/${regularUserId}`, adminToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe('Missing custom_instructions');
        });
    });

    describe('GET /profile', () => {
        beforeEach(async () => {
            // Add custom instructions to regular user
            await env.DB.prepare('UPDATE users SET custom_instructions = ? WHERE id = ?')
                .bind('My personal instructions', regularUserId)
                .run();
        });

        it('should return own profile for authenticated user', async () => {
            const request = createAuthenticatedRequest('http://example.com/profile', userToken);

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);

            const profile = (await response.json()) as { id: number; username: string; custom_instructions: string };
            expect(profile.id).toBe(regularUserId);
            expect(profile.username).toBe('testuser');
            expect(profile.custom_instructions).toBe('My personal instructions');
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/profile');

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });
    });

    describe('PUT /profile', () => {
        it('should update own profile for authenticated user', async () => {
            const newInstructions = 'My updated instructions';
            const request = createAuthenticatedRequest('http://example.com/profile', userToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: newInstructions }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(200);
            expect(await response.text()).toBe('OK');

            // Verify instructions were updated
            const user = (await env.DB.prepare('SELECT custom_instructions FROM users WHERE id = ?').bind(regularUserId).first()) as { custom_instructions: string } | null;
            expect(user?.custom_instructions).toBe(newInstructions);
        });

        it('should reject unauthenticated requests', async () => {
            const request = new Request('http://example.com/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: 'New instructions' }),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(401);
            expect(await response.text()).toBe('Unauthorized');
        });

        it('should handle missing custom_instructions field', async () => {
            const request = createAuthenticatedRequest('http://example.com/profile', userToken, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const response = await worker.fetch(request, env);

            expect(response.status).toBe(400);
            expect(await response.text()).toBe('Missing custom_instructions');
        });
    });
});
