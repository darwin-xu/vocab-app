function randomId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Environment-aware API endpoints
function getApiEndpoints(env: any) {
    const isLocal = env.ENVIRONMENT === 'development';

    console.log('isLocal:', isLocal);

    if (isLocal) {
        console.log('Using development API endpoints');
        return 'http://35.234.22.51:8080';
    } else {
        console.log('Using production API endpoints');
        return 'https://api.openai.com';
    }
}

const SESSIONS = new Map(); // In-memory session store (for demo; use DB or KV in production)

async function getUserIdFromRequest(request: Request, env: any): Promise<number | null> {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    const session = SESSIONS.get(auth.replace('Bearer ', ''));
    if (!session) return null;
    return session.user_id;
}

async function getSessionFromRequest(request: Request): Promise<{ user_id: number; is_admin: boolean } | null> {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    const session = SESSIONS.get(auth.replace('Bearer ', ''));
    return session || null;
}

export default {
    async fetch(request: Request, env: any): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/register' && request.method === 'POST') {
            const body = await request.json();
            const username = (body as any).username;
            const password = (body as any).password;
            if (!username || !password) return new Response('Missing username or password', { status: 400 });
            const exists = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
            if (exists) return new Response('Username already exists', { status: 409 });
            await env.DB.prepare('INSERT INTO users (username, password, created_at) VALUES (?, ?, datetime(\'now\'))').bind(username, password).run();
            return new Response('OK');
        }

        if (url.pathname === '/login' && request.method === 'POST') {
            const body = await request.json();
            const username = (body as any).username;
            const password = (body as any).password;
            if (!username || !password) return new Response('Missing username or password', { status: 400 });
            const user = await env.DB.prepare('SELECT id, password, is_admin FROM users WHERE username = ?').bind(username).first();
            if (!user || user.password !== password) return new Response('Invalid credentials', { status: 401 });
            const token = randomId();
            SESSIONS.set(token, { user_id: user.id, is_admin: user.is_admin });
            return new Response(JSON.stringify({ token, is_admin: user.is_admin }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (url.pathname === "/openai") {
            const { searchParams } = new URL(request.url);
            const word = searchParams.get("word") || "Say hi!";
            const func = searchParams.get("func") || "define";

            // Get user ID from request to fetch custom instructions
            const userId = await getUserIdFromRequest(request, env);
            let customInstructions = null;

            if (userId) {
                const user = await env.DB.prepare('SELECT custom_instructions FROM users WHERE id = ?').bind(userId).first();
                customInstructions = user?.custom_instructions;
            }

            const defaultPrompt = customInstructions ||
                (`Define the word '${word}' in this way:` +
                    `[the word's classification]  \n` +
                    `**definition**  \n` +
                    `**next classification**  \n` +
                    `next definition  \n` +
                    `**etymology**`);

            let prompt = "";
            switch (func) {
                case "define":
                    prompt = customInstructions ?
                        customInstructions.replace('{word}', word) :
                        defaultPrompt;
                    break;
                case "example":
                    prompt = `Give 1~3 (more if necessary) example sentences using the word '${word}'. no extra words. Provide the sentences in markdown lists.`;
                    break;
                case "synonym":
                    prompt = `List 1~3 (more if necessary) synonyms for the word '${word}'. no extra words. Provide the sentences in markdown lists`;
                    break;
                default:
                    prompt = customInstructions ?
                        customInstructions.replace('{word}', word) :
                        defaultPrompt;
            }

            console.log("/openai called with word:", word, "func:", func);
            console.log("Prompt sent to OpenAI:", prompt);

            const openaiRes = await fetch(getApiEndpoints(env) + '/v1/chat/completions', {
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
            const ttsRes = await fetch(getApiEndpoints(env) + '/v1/audio/speech', {
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
            const userId = await getUserIdFromRequest(request, env);
            if (!userId) return new Response('Unauthorized', { status: 401 });
            const body = await request.json();
            if (typeof body !== 'object' || body === null || !('word' in body)) {
                return new Response('Missing word', { status: 400 });
            }
            const word = (body as { word: string }).word;
            if (!word) return new Response('Missing word', { status: 400 });
            const exists = await env.DB.prepare('SELECT 1 FROM vocab WHERE user_id = ? AND word = ?').bind(userId, word).first();
            if (exists) return new Response('Word already exists', { status: 409 });
            await env.DB.prepare(
                'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)'
            ).bind(userId, word, new Date().toISOString()).run();
            return new Response('OK');
        }

        if (request.method === 'POST' && url.pathname === '/remove') {
            const userId = await getUserIdFromRequest(request, env);
            if (!userId) return new Response('Unauthorized', { status: 401 });
            const body = await request.json() as { words: string[] };
            const words = body.words;
            if (!Array.isArray(words) || words.length === 0) return new Response('No words provided', { status: 400 });
            for (const word of words) {
                await env.DB.prepare('DELETE FROM vocab WHERE user_id = ? AND word = ?').bind(userId, word).run();
            }
            return new Response('OK');
        }

        if (url.pathname === '/vocab') {
            const userId = await getUserIdFromRequest(request, env);
            if (!userId) return new Response('Unauthorized', { status: 401 });
            const q = url.searchParams.get('q') ?? '';
            const page = parseInt(url.searchParams.get('page') ?? '1', 10);
            const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
            const offset = (page - 1) * pageSize;
            const totalRow = await env.DB.prepare(
                'SELECT COUNT(*) as count FROM vocab WHERE user_id = ? AND word LIKE ?'
            ).bind(userId, `%${q}%`).first();
            const total = totalRow ? totalRow.count : 0;
            const { results } = await env.DB.prepare(
                'SELECT * FROM vocab WHERE user_id = ? AND word LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?'
            ).bind(userId, `%${q}%`, pageSize, offset).all();
            return new Response(JSON.stringify({ results, total }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Admin-only endpoints
        if (url.pathname === '/admin/users') {
            const session = await getSessionFromRequest(request);
            if (!session || !session.is_admin) return new Response('Unauthorized', { status: 401 });

            const { results } = await env.DB.prepare(
                'SELECT id, username, created_at FROM users WHERE is_admin = 0 ORDER BY created_at DESC'
            ).all();
            return new Response(JSON.stringify({ users: results }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.pathname.startsWith('/admin/users/') && request.method === 'GET') {
            const session = await getSessionFromRequest(request);
            if (!session || !session.is_admin) return new Response('Unauthorized', { status: 401 });

            const userId = url.pathname.split('/').pop();
            if (!userId) return new Response('Invalid user ID', { status: 400 });

            const user = await env.DB.prepare(
                'SELECT id, username, custom_instructions FROM users WHERE id = ? AND is_admin = 0'
            ).bind(userId).first();

            if (!user) return new Response('User not found', { status: 404 });

            return new Response(JSON.stringify({ user }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.pathname.startsWith('/admin/users/') && request.method === 'PUT') {
            const session = await getSessionFromRequest(request);
            if (!session || !session.is_admin) return new Response('Unauthorized', { status: 401 });

            const userId = url.pathname.split('/').pop();
            if (!userId) return new Response('Invalid user ID', { status: 400 });

            const body = await request.json();
            const customInstructions = (body as any).custom_instructions;

            await env.DB.prepare(
                'UPDATE users SET custom_instructions = ? WHERE id = ? AND is_admin = 0'
            ).bind(customInstructions, userId).run();

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        /* Fallback to static assets in /public */
        return env.ASSETS.fetch(request);
    }
};
