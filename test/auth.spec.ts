// test/auth.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';
import { initializeTestDatabase } from './helpers/test-utils';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Authentication endpoints', () => {
	beforeAll(async () => {
		// Initialize database schema
		await initializeTestDatabase();
	});

	beforeEach(async () => {
		// Clean up database before each test
		await env.DB.prepare('DELETE FROM users').run();
	});

	describe('POST /register', () => {
		it('should register a new user successfully', async () => {
			const request = new IncomingRequest('http://example.com/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser', password: 'testpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(await response.text()).toBe('OK');

			// Verify user was created in database
			const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
				.bind('testuser').first();
			expect(user).toBeTruthy();
			expect(user.username).toBe('testuser');
		});

		it('should reject registration with missing username', async () => {
			const request = new IncomingRequest('http://example.com/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'testpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			expect(await response.text()).toBe('Missing username or password');
		});

		it('should reject registration with missing password', async () => {
			const request = new IncomingRequest('http://example.com/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			expect(await response.text()).toBe('Missing username or password');
		});

		it('should reject registration with existing username', async () => {
			// First registration
			await env.DB.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
				.bind('testuser', 'testpass').run();

			const request = new IncomingRequest('http://example.com/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser', password: 'testpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(409);
			expect(await response.text()).toBe('Username already exists');
		});
	});

	describe('POST /login', () => {
		beforeEach(async () => {
			// Create a test user
			await env.DB.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)')
				.bind('testuser', 'testpass', 0).run();
		});

		it('should login successfully with correct credentials', async () => {
			const request = new IncomingRequest('http://example.com/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser', password: 'testpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data.token).toBeTruthy();
			expect(data.is_admin).toBe(0);
		});

		it('should reject login with wrong password', async () => {
			const request = new IncomingRequest('http://example.com/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser', password: 'wrongpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(401);
			expect(await response.text()).toBe('Invalid credentials');
		});

		it('should reject login with non-existent user', async () => {
			const request = new IncomingRequest('http://example.com/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'nonexistent', password: 'testpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(401);
			expect(await response.text()).toBe('Invalid credentials');
		});

		it('should reject login with missing credentials', async () => {
			const request = new IncomingRequest('http://example.com/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'testuser' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			expect(await response.text()).toBe('Missing username or password');
		});

		it('should return admin flag for admin users', async () => {
			// Create admin user
			await env.DB.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)')
				.bind('admin', 'adminpass', 1).run();

			const request = new IncomingRequest('http://example.com/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'admin', password: 'adminpass' })
			});

			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data.token).toBeTruthy();
			expect(data.is_admin).toBe(1);
		});
	});
});
