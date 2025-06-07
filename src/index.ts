interface Env {
    DB: D1Database;
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    OPENAI_TOKEN: string;
    ENVIRONMENT?: string;
}

interface RegisterRequestBody {
    username: string;
    password: string;
}

interface LoginRequestBody {
    username: string;
    password: string;
}

interface VocabRequestBody {
    word: string;
}

interface DeleteVocabRequestBody {
    words: string[];
}

interface UpdateUserRequestBody {
    custom_instructions?: string | null;
}

interface OpenAIResponse {
    choices?: { message?: { content?: string } }[];
}

interface UserRow {
    id: number;
    username: string;
    password: string;
    is_admin: boolean;
    custom_instructions?: string | null;
}

interface VocabCountResult {
    count: number;
}

function randomId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function getApiEndpoints(env: Env): string {
    const isLocal = env.ENVIRONMENT === 'development';
    console.log('isLocal:', isLocal);

    return isLocal 
        ? 'http://35.234.22.51:8080'
        : 'https://api.openai.com';
}

const SESSIONS = new Map<string, { user_id: number; is_admin: boolean }>();

async function getUserIdFromRequest(request: Request): Promise<number | null> {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    const session = SESSIONS.get(auth.replace('Bearer ', ''));
    return session?.user_id ?? null;
}

async function getSessionFromRequest(request: Request): Promise<{ user_id: number; is_admin: boolean } | null> {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    const session = SESSIONS.get(auth.replace('Bearer ', ''));
    return session ?? null;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/register' && request.method === 'POST') {
            try {
                const body = await request.json() as RegisterRequestBody;
                if (!body.username || !body.password) {
                    return new Response('Missing username or password', { status: 400 });
                }

                const exists = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?')
                    .bind(body.username)
                    .first();
                if (exists) {
                    return new Response('Username already exists', { status: 409 });
                }

                await env.DB.prepare(
                    'INSERT INTO users (username, password, created_at) VALUES (?, ?, datetime(\'now\'))'
                )
                    .bind(body.username, body.password)
                    .run();

                return new Response('OK');
            } catch {
                return new Response('Invalid JSON', { status: 400 });
            }
        }

        if (url.pathname === '/login' && request.method === 'POST') {
            try {
                const body = await request.json() as LoginRequestBody;
                if (!body.username || !body.password) {
                    return new Response('Missing username or password', { status: 400 });
                }

                const user = await env.DB.prepare('SELECT id, password, is_admin FROM users WHERE username = ?')
                    .bind(body.username)
                    .first() as UserRow | null;

                if (!user || user.password !== body.password) {
                    return new Response('Invalid credentials', { status: 401 });
                }

                const token = randomId();
                SESSIONS.set(token, { user_id: user.id, is_admin: user.is_admin });
                return new Response(
                    JSON.stringify({ token, is_admin: user.is_admin }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } catch {
                return new Response('Invalid JSON', { status: 400 });
            }
        }

        if (url.pathname === '/vocab') {
            const userId = await getUserIdFromRequest(request);
            if (!userId) return new Response('Unauthorized', { status: 401 });

            if (request.method === 'GET') {
                const q = url.searchParams.get('q') ?? '';
                const page = parseInt(url.searchParams.get('page') ?? '1', 10);
                const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
                const offset = (page - 1) * pageSize;

                const totalRow = await env.DB.prepare(
                    'SELECT COUNT(*) as count FROM vocab WHERE user_id = ? AND word LIKE ?'
                )
                    .bind(userId, `%${q}%`)
                    .first() as VocabCountResult;

                const total = totalRow?.count ?? 0;
                const { results } = await env.DB.prepare(
                    'SELECT * FROM vocab WHERE user_id = ? AND word LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?'
                )
                    .bind(userId, `%${q}%`, pageSize, offset)
                    .all();

                const totalPages = Math.ceil(total / pageSize);
                return new Response(
                    JSON.stringify({
                        items: results,
                        currentPage: page,
                        totalPages
                    }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (request.method === 'POST') {
                try {
                    const body = await request.json() as VocabRequestBody;
                    if (!body.word) {
                        return new Response('Missing word', { status: 400 });
                    }

                    const exists = await env.DB.prepare('SELECT 1 FROM vocab WHERE user_id = ? AND word = ?')
                        .bind(userId, body.word)
                        .first();
                    if (exists) {
                        return new Response('Word already exists', { status: 409 });
                    }

                    await env.DB.prepare(
                        'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)'
                    )
                        .bind(userId, body.word, new Date().toISOString())
                        .run();
                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }

            if (request.method === 'DELETE') {
                try {
                    const body = await request.json() as DeleteVocabRequestBody;
                    if (!Array.isArray(body.words) || body.words.length === 0) {
                        return new Response('No words provided', { status: 400 });
                    }

                    for (const word of body.words) {
                        await env.DB.prepare('DELETE FROM vocab WHERE user_id = ? AND word = ?')
                            .bind(userId, word)
                            .run();
                    }
                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }
        }

        if (url.pathname === '/admin/users') {
            const session = await getSessionFromRequest(request);
            if (!session) return new Response('Unauthorized', { status: 401 });
            if (!session.is_admin) return new Response('Admin access required', { status: 403 });

            const { results } = await env.DB.prepare(
                'SELECT id, username, created_at FROM users ORDER BY created_at DESC'
            ).all();

            return new Response(
                JSON.stringify(results),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (url.pathname === '/profile') {
            const userId = await getUserIdFromRequest(request);
            if (!userId) return new Response('Unauthorized', { status: 401 });

            if (request.method === 'GET') {
                const user = await env.DB.prepare(
                    'SELECT id, username, custom_instructions FROM users WHERE id = ?'
                )
                    .bind(userId)
                    .first() as UserRow | null;

                if (!user) return new Response('User not found', { status: 404 });

                return new Response(
                    JSON.stringify({
                        id: user.id,
                        username: user?.username,
                        custom_instructions: user.custom_instructions
                    }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }

            if (request.method === 'PUT') {
                try {
                    const body = await request.json() as UpdateUserRequestBody;
                    if (!('custom_instructions' in body)) {
                        return new Response('Missing custom_instructions', { status: 400 });
                    }

                    const instructionsValue = body.custom_instructions ?? null;

                    await env.DB.prepare(
                        'UPDATE users SET custom_instructions = ? WHERE id = ?'
                    )
                        .bind(instructionsValue, userId)
                        .run();

                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }
        }

        if (url.pathname === "/openai") {
            const { searchParams } = new URL(request.url);
            const word = searchParams.get("word") ?? "Say hi!";
            const func = searchParams.get("func") ?? "define";

            const userId = await getUserIdFromRequest(request);
            let customInstructions: string | null = null;

            if (userId) {
                const user = await env.DB.prepare('SELECT custom_instructions FROM users WHERE id = ?')
                    .bind(userId)
                    .first() as UserRow | null;
                customInstructions = user?.custom_instructions ?? null;
            }

            const defaultPrompt = `Define the word '${word}'`;
            const prompt = func === "example"
                ? `Make 1~3 sentences using the word '${word}'. Provide in markdown lists.`
                : func === "synonym"
                    ? `List 1~3 synonyms for the word '${word}'. Provide in markdown lists`
                    : defaultPrompt;

            const messages = [
                ...(customInstructions ? [{ role: "developer", content: customInstructions }] : []),
                { role: "user", content: prompt }
            ];

            const openaiRes = await fetch(`${getApiEndpoints(env)}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${env.OPENAI_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4.1-nano",
                    messages
                })
            });

            if (!openaiRes.ok) {
                console.error("OpenAI API error:", await openaiRes.text());
                return new Response("OpenAI API error", { status: 500 });
            }

            const data = await openaiRes.json() as OpenAIResponse;
            const content = data.choices?.[0]?.message?.content ?? "";

            return new Response(content);
        }

        if (url.pathname === '/tts') {
            const text = url.searchParams.get('text') ?? '';
            if (!text) {
                return new Response(
                    JSON.stringify({ error: 'No text provided' }), 
                    { status: 400 }
                );
            }

            const ttsRes = await fetch(`${getApiEndpoints(env)}/v1/audio/speech`, {
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
                return new Response(
                    JSON.stringify({ error: await ttsRes.text() }),
                    { status: 500 }
                );
            }

            const audioBuffer = await ttsRes.arrayBuffer();
            const uint8Array = new Uint8Array(audioBuffer);
            const binary = Array.from(uint8Array)
                .map(byte => String.fromCharCode(byte))
                .join('');
            const audioBase64 = btoa(binary);

            return new Response(
                JSON.stringify({ audio: audioBase64 }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        }

        return env.ASSETS.fetch(request);
    }
};
