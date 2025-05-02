export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/openai") {
			const { searchParams } = new URL(request.url);
			const word = searchParams.get("prompt") || "Say hi!";
			const prompt = `Define the word '${word}' in 20 words.`;

			console.log("/openai called with word:", word);
			console.log("Prompt sent to OpenAI:", prompt);

			const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${env.OPENAI_TOKEN}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					model: "gpt-3.5-turbo",
					messages: [{ role: "user", content: prompt }]
				})
			});

			console.log("OpenAI API response status:", openaiRes.status);

			if (!openaiRes.ok) {
				const errorText = await openaiRes.text();
				console.log("OpenAI API error response:", errorText);
				return new Response("OpenAI API error", { status: 500 });
			}

			const data = await openaiRes.json() as {
				choices?: { message?: { content?: string } }[];
			};
			console.log("OpenAI API response data:", data);
			const message = data.choices?.[0]?.message?.content || "";

			return new Response(message, { status: 200 });
		}

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

		if (request.method === 'POST' && url.pathname === '/remove') {
			const body = await request.json() as { words: string[] };
			const words = body.words;
			if (!Array.isArray(words) || words.length === 0) return new Response('No words provided', { status: 400 });
			for (const word of words) {
				await env.DB.prepare('DELETE FROM vocab WHERE word = ?').bind(word).run();
			}
			return new Response('OK');
		}

		if (url.pathname === '/vocab') {
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
