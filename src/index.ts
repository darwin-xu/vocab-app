export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const url = new URL(request.url);

		/* ---------- API ROUTES ---------- */
		if (request.method === "POST" && url.pathname === "/add") {
			const { word, meaning } = await request.json();
			const add_date = new Date().toISOString();
			await env.DB.prepare(
				"INSERT INTO vocab (word, meaning, add_date) VALUES (?, ?, ?)"
			).bind(word, meaning, add_date).run();
			return new Response("OK");
		}

		if (url.pathname === "/search") {
			const q = url.searchParams.get("q") || "";
			const { results } = await env.DB.prepare(
				"SELECT * FROM vocab WHERE word LIKE ? ORDER BY id DESC"
			).bind(`%${q}%`).all();
			return new Response(JSON.stringify(results), {
				headers: { "Content-Type": "application/json" },
			});
		}

		/* ---------- FRONTEND ---------- */
		const page = `<!DOCTYPE html>
  <html>
	<head>
	  <meta charset="UTF-8" />
	  <title>Vocabulary App</title>
	  <style>
		body { font-family: sans-serif; padding: 1rem; max-width: 640px; margin: auto; }
		input, button { margin: .25rem 0; padding: .5rem; }
		table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
		th, td { border: 1px solid #ccc; padding: .5rem; text-align: left; }
	  </style>
	</head>
	<body>
	  <h1>Vocabulary</h1>
  
	  <input id="word" placeholder="Word" /> <br />
	  <input id="meaning" placeholder="Meaning" /> <br />
	  <button id="addBtn">Add Word</button>
  
	  <hr />
  
	  <input id="search" placeholder="Search words…" />
	  <table>
		<thead>
		  <tr><th>Word</th><th>Meaning</th><th>Added</th></tr>
		</thead>
		<tbody id="list"></tbody>
	  </table>
  
	  <script>
		const wordEl = document.getElementById('word');
		const meaningEl = document.getElementById('meaning');
		const searchEl = document.getElementById('search');
		const listEl = document.getElementById('list');
		const addBtn = document.getElementById('addBtn');
  
		async function addWord() {
		  const word = wordEl.value.trim();
		  const meaning = meaningEl.value.trim();
		  if (!word || !meaning) return;
		  await fetch('/add', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ word, meaning })
		  });
		  wordEl.value = '';
		  meaningEl.value = '';
		  searchWords();
		}
  
		async function searchWords() {
		  const q = searchEl.value;
		  const res = await fetch('/search?q=' + encodeURIComponent(q));
		  const data = await res.json();
		  listEl.innerHTML = data.map(r =>
			'<tr><td>' + r.word + '</td><td>' + r.meaning + '</td><td>' +
			new Date(r.add_date).toLocaleString() + '</td></tr>'
		  ).join('');
		}
  
		addBtn.addEventListener('click', addWord);
		searchEl.addEventListener('input', searchWords);
		document.addEventListener('DOMContentLoaded', searchWords);
	  </script>
	</body>
  </html>`;

		return new Response(page, { headers: { 'Content-Type': 'text/html' } });
	}
};
