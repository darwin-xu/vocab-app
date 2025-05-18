export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/openai") {
			const { searchParams } = new URL(request.url);
			const word = searchParams.get("word") || "Say hi!";
			const func = searchParams.get("func") || "define";

			const defaultPrompt = `Define the word '${word}' in this way:` +
				`[the word's classification]  \n` +
				`**definition**  \n` +
				`**next classification**  \n` +
				`next definition  \n` +
				`**etymology**`;

			let prompt = "";
			switch (func) {
				case "define":
					prompt = defaultPrompt;
					break;
				case "example":
					prompt = `Give 1~3 (more if necessary) example sentences using the word '${word}'. no extra words. Provide the sentences in markdown lists.`;
					break;
				case "synonym":
					prompt = `List 1~3 (more if necessary) synonyms for the word '${word}'. no extra words. Provide the sentences in markdown lists`;
					break;
				default:
					prompt = defaultPrompt;
			}

			console.log("/openai called with word:", word, "func:", func);
			console.log("Prompt sent to OpenAI:", prompt);

			const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${env.OPENAI_TOKEN}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					model: "gpt-4.1-nano",
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

		if (url.pathname === '/tts') {
			const text = url.searchParams.get('text') || '';
			if (!text) return new Response(JSON.stringify({ error: 'No text provided' }), { status: 400 });
			const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${env.OPENAI_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini-tts',
					input: text,
					voice: 'alloy',
					response_format: 'wav'
				})
			});
			if (!ttsRes.ok) {
				const errorText = await ttsRes.text();
				return new Response(JSON.stringify({ error: errorText }), { status: 500 });
			}
			const audioBuffer = await ttsRes.arrayBuffer();
			const uint8Array = new Uint8Array(audioBuffer);
			let binary = '';
			for (let i = 0; i < uint8Array.length; i++) {
				binary += String.fromCharCode(uint8Array[i]);
			}
			const audioBase64 = btoa(binary);
			return new Response(JSON.stringify({ audio: audioBase64 }), {
				headers: { 'Content-Type': 'application/json' }
			});
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
			const page = parseInt(url.searchParams.get('page') ?? '1', 10);
			const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
			const offset = (page - 1) * pageSize;
			const totalRow = await env.DB.prepare(
				'SELECT COUNT(*) as count FROM vocab WHERE word LIKE ?'
			).bind(`%${q}%`).first();
			const total = totalRow ? totalRow.count : 0;
			const { results } = await env.DB.prepare(
				'SELECT * FROM vocab WHERE word LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?'
			).bind(`%${q}%`, pageSize, offset).all();
			return new Response(JSON.stringify({ results, total }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		/* Fallback to static assets in /public */
		return env.ASSETS.fetch(request);
	}
};
