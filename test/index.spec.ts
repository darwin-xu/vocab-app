// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Worker static asset serving', () => {
	it('responds with HTML content (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		
		// Check that it returns HTML content
		expect(response.headers.get('content-type')).toContain('text/html');
		const html = await response.text();
		expect(html).toContain('<!doctype html>');
		expect(html).toContain('Vocabulary Builder');
	});

	it('responds with HTML content (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		
		// Check that it returns HTML content
		expect(response.headers.get('content-type')).toContain('text/html');
		const html = await response.text();
		expect(html).toContain('<!doctype html>');
		expect(html).toContain('Vocabulary Builder');
	});
});
