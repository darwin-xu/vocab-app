export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/add') {
			const body = await request.json();
			if (typeof body !== 'object' || body === null || !('word' in body)) {
				return new Response('Missing word', { status: 400 });
			}
			const word = (body as { word: string }).word;
			if (!word) return new Response('Missing word', { status: 400 });
			const exists = await env.DB.prepare('SELECT 1 FROM vocab WHERE word = ?').bind(word).first();
			if (exists) return new Response('Word already exists', { status: 409 });
			await env.DB.prepare(
				'INSERT INTO vocab (word, add_date) VALUES (?, ?)'
			).bind(word, new Date().toISOString()).run();
			return new Response('OK');
		}

		if (url.pathname === '/search') {
			const q = url.searchParams.get('q') ?? '';
			const { results } = await env.DB.prepare(
				'SELECT * FROM vocab WHERE word LIKE ? ORDER BY id DESC'
			).bind(`%${q}%`).all();
			return new Response(JSON.stringify(results), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		/* Fallback to static assets in /public */
		return env.ASSETS.fetch(request);
	}
};
