// test/index.spec.ts
import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Worker static asset serving', () => {
    it('responds with HTML content (unit style)', async () => {
        const request = new Request('http://example.com');
        const response = await worker.fetch(request, env);

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
