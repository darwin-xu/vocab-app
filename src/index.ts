export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/add') {
			const { word, meaning } = await request.json();
			await env.DB.prepare(
				'INSERT INTO vocab (word, meaning, add_date) VALUES (?, ?, ?)'
			).bind(word, meaning, new Date().toISOString()).run();
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
