import {
    Env,
    UserRow,
    VocabCountResult,
    OpenAIResponse,
    RegisterRequestBody,
    LoginRequestBody,
    VocabRequestBody,
    DeleteVocabRequestBody,
    UpdateUserRequestBody,
    NoteRequestBody,
    DeleteNoteRequestBody,
} from './types.js';

import cachedSchema from './schemas/english_dictionary.schema.json';
import { convertDictionaryToMarkdown } from './utils/jsonToMarkdown.js';

function randomId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function getApiEndpoints(env: Env): string {
    const isLocal = env.ENVIRONMENT === 'development';
    console.log('isLocal:', isLocal);

    return isLocal ? 'http://35.234.22.51:8080' : 'https://api.openai.com';
}

const SESSIONS = new Map<string, { user_id: number; is_admin: boolean }>();

async function getUserIdFromRequest(request: Request): Promise<number | null> {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    const session = SESSIONS.get(auth.replace('Bearer ', ''));
    return session?.user_id ?? null;
}

async function getSessionFromRequest(
    request: Request,
): Promise<{ user_id: number; is_admin: boolean } | null> {
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
                const body = (await request.json()) as RegisterRequestBody;
                if (!body.username || !body.password) {
                    return new Response('Missing username or password', {
                        status: 400,
                    });
                }

                const exists = await env.DB.prepare(
                    'SELECT 1 FROM users WHERE username = ?',
                )
                    .bind(body.username)
                    .first();
                if (exists) {
                    return new Response('Username already exists', {
                        status: 409,
                    });
                }

                await env.DB.prepare(
                    "INSERT INTO users (username, password, created_at) VALUES (?, ?, datetime('now'))",
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
                const body = (await request.json()) as LoginRequestBody;
                if (!body.username || !body.password) {
                    return new Response('Missing username or password', {
                        status: 400,
                    });
                }

                const user = (await env.DB.prepare(
                    'SELECT id, password, is_admin FROM users WHERE username = ?',
                )
                    .bind(body.username)
                    .first()) as UserRow | null;

                if (!user || user.password !== body.password) {
                    return new Response('Invalid credentials', { status: 401 });
                }

                const token = randomId();
                SESSIONS.set(token, {
                    user_id: user.id,
                    is_admin: user.is_admin,
                });
                return new Response(
                    JSON.stringify({ token, is_admin: user.is_admin }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                    },
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
                const pageSize = parseInt(
                    url.searchParams.get('pageSize') ?? '20',
                    10,
                );
                const offset = (page - 1) * pageSize;

                const totalRow = (await env.DB.prepare(
                    'SELECT COUNT(*) as count FROM vocab WHERE user_id = ? AND word LIKE ?',
                )
                    .bind(userId, `%${q}%`)
                    .first()) as VocabCountResult;

                const total = totalRow?.count ?? 0;
                const { results } = await env.DB.prepare(
                    `
                    SELECT v.*, n.note 
                    FROM vocab v 
                    LEFT JOIN notes n ON v.user_id = n.user_id AND v.word = n.word 
                    WHERE v.user_id = ? AND v.word LIKE ? 
                    ORDER BY v.id DESC 
                    LIMIT ? OFFSET ?
                `,
                )
                    .bind(userId, `%${q}%`, pageSize, offset)
                    .all();

                const totalPages = Math.ceil(total / pageSize);
                return new Response(
                    JSON.stringify({
                        items: results,
                        currentPage: page,
                        totalPages,
                    }),
                    { headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (request.method === 'POST') {
                try {
                    const body = (await request.json()) as VocabRequestBody;
                    if (!body.word) {
                        return new Response('Missing word', { status: 400 });
                    }

                    const exists = await env.DB.prepare(
                        'SELECT 1 FROM vocab WHERE user_id = ? AND word = ?',
                    )
                        .bind(userId, body.word)
                        .first();
                    if (exists) {
                        return new Response('Word already exists', {
                            status: 409,
                        });
                    }

                    await env.DB.prepare(
                        'INSERT INTO vocab (user_id, word, add_date) VALUES (?, ?, ?)',
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
                    const body =
                        (await request.json()) as DeleteVocabRequestBody;
                    if (!Array.isArray(body.words) || body.words.length === 0) {
                        return new Response('No words provided', {
                            status: 400,
                        });
                    }

                    for (const word of body.words) {
                        await env.DB.prepare(
                            'DELETE FROM vocab WHERE user_id = ? AND word = ?',
                        )
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
            if (!session.is_admin)
                return new Response('Admin access required', { status: 403 });

            const { results } = await env.DB.prepare(
                'SELECT id, username, created_at FROM users ORDER BY created_at DESC',
            ).all();

            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Admin endpoint to get user details by ID
        if (
            url.pathname.startsWith('/admin/users/') &&
            url.pathname !== '/admin/users'
        ) {
            const session = await getSessionFromRequest(request);
            if (!session) return new Response('Unauthorized', { status: 401 });
            if (!session.is_admin)
                return new Response('Admin access required', { status: 403 });

            const userIdStr = url.pathname.split('/admin/users/')[1];
            const userId = parseInt(userIdStr, 10);

            if (isNaN(userId)) {
                return new Response('Invalid user ID', { status: 400 });
            }

            if (request.method === 'GET') {
                const user = (await env.DB.prepare(
                    'SELECT id, username, created_at, custom_instructions FROM users WHERE id = ?',
                )
                    .bind(userId)
                    .first()) as UserRow | null;

                if (!user)
                    return new Response('User not found', { status: 404 });

                return new Response(
                    JSON.stringify({
                        id: user.id,
                        username: user.username,
                        created_at: user.created_at,
                        custom_instructions: user.custom_instructions,
                    }),
                    { headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (request.method === 'PUT') {
                try {
                    const body =
                        (await request.json()) as UpdateUserRequestBody;
                    if (!('custom_instructions' in body)) {
                        return new Response('Missing custom_instructions', {
                            status: 400,
                        });
                    }

                    const instructionsValue = body.custom_instructions ?? null;

                    // First check if user exists
                    const userExists = await env.DB.prepare(
                        'SELECT 1 FROM users WHERE id = ?',
                    )
                        .bind(userId)
                        .first();

                    if (!userExists) {
                        return new Response('User not found', { status: 404 });
                    }

                    await env.DB.prepare(
                        'UPDATE users SET custom_instructions = ? WHERE id = ?',
                    )
                        .bind(instructionsValue, userId)
                        .run();

                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }
        }

        if (url.pathname === '/profile') {
            const userId = await getUserIdFromRequest(request);
            if (!userId) return new Response('Unauthorized', { status: 401 });

            if (request.method === 'GET') {
                const user = (await env.DB.prepare(
                    'SELECT id, username, custom_instructions FROM users WHERE id = ?',
                )
                    .bind(userId)
                    .first()) as UserRow | null;

                if (!user)
                    return new Response('User not found', { status: 404 });

                return new Response(
                    JSON.stringify({
                        user: {
                            id: user.id,
                            username: user?.username,
                            custom_instructions: user.custom_instructions,
                        },
                    }),
                    { headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (request.method === 'PUT') {
                try {
                    const body =
                        (await request.json()) as UpdateUserRequestBody;
                    if (!('custom_instructions' in body)) {
                        return new Response('Missing custom_instructions', {
                            status: 400,
                        });
                    }

                    const instructionsValue = body.custom_instructions ?? null;

                    await env.DB.prepare(
                        'UPDATE users SET custom_instructions = ? WHERE id = ?',
                    )
                        .bind(instructionsValue, userId)
                        .run();

                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }
        }

        if (url.pathname === '/openai') {
            const { searchParams } = new URL(request.url);
            const word = searchParams.get('word') ?? 'Say hi!';
            const action = searchParams.get('action') ?? 'define';

            const userId = await getUserIdFromRequest(request);
            let customInstructions: string | null = null;

            if (userId) {
                const user = (await env.DB.prepare(
                    'SELECT custom_instructions FROM users WHERE id = ?',
                )
                    .bind(userId)
                    .first()) as UserRow | null;
                customInstructions = user?.custom_instructions ?? null;
            }

            const defaultPrompt = `Define the word '${word}'`;
            const prompt =
                action === 'example'
                    ? `Make 1~3 sentences using the word '${word}'. Provide in markdown lists.`
                    : action === 'synonym'
                      ? `List 1~3 synonyms for the word '${word}'. Provide in markdown lists`
                      : defaultPrompt;

            const input = [
                ...(customInstructions
                    ? [{ role: 'system', content: customInstructions }]
                    : []),
                { role: 'user', content: prompt },
            ];

            const openaiRes = await fetch(
                `${getApiEndpoints(env)}/v1/responses`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${env.OPENAI_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4.1-nano',
                        input: input,
                        text: {
                            format: cachedSchema,
                        },
                    }),
                },
            );

            if (!openaiRes.ok) {
                console.error('OpenAI API error:', await openaiRes.text());
                return new Response('OpenAI API error', { status: 500 });
            }

            const data = (await openaiRes.json()) as OpenAIResponse;
            const content = data.output?.[0].content?.[0]?.text;

            // Try to parse the content as JSON and convert to Markdown
            let responseText = content;
            if (content) {
                try {
                    const jsonData = JSON.parse(content);
                    // Check if it matches our dictionary schema structure
                    if (jsonData.word && jsonData.meanings) {
                        responseText = convertDictionaryToMarkdown(jsonData);
                    }
                } catch {
                    // If parsing fails, return the original content
                    console.log(
                        'Could not parse OpenAI response as JSON, returning original content',
                    );
                }
            }

            return new Response(responseText);
        }

        if (url.pathname === '/tts') {
            const text = url.searchParams.get('text') ?? '';
            if (!text) {
                return new Response(
                    JSON.stringify({ error: 'No text provided' }),
                    { status: 400 },
                );
            }

            const ttsRes = await fetch(
                `${getApiEndpoints(env)}/v1/audio/speech`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${env.OPENAI_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini-tts',
                        input: text,
                        voice: 'alloy',
                        response_format: 'wav',
                    }),
                },
            );

            if (!ttsRes.ok) {
                return new Response(
                    JSON.stringify({ error: await ttsRes.text() }),
                    { status: 500 },
                );
            }

            const audioBuffer = await ttsRes.arrayBuffer();
            const uint8Array = new Uint8Array(audioBuffer);
            const binary = Array.from(uint8Array)
                .map((byte) => String.fromCharCode(byte))
                .join('');
            const audioBase64 = btoa(binary);

            return new Response(JSON.stringify({ audio: audioBase64 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (url.pathname === '/notes') {
            const userId = await getUserIdFromRequest(request);
            if (!userId) return new Response('Unauthorized', { status: 401 });

            if (request.method === 'GET') {
                const word = url.searchParams.get('word');
                if (!word) {
                    return new Response('Missing word parameter', {
                        status: 400,
                    });
                }

                const note = (await env.DB.prepare(
                    'SELECT note FROM notes WHERE user_id = ? AND word = ?',
                )
                    .bind(userId, word)
                    .first()) as { note: string } | null;

                return new Response(
                    JSON.stringify({ note: note?.note || null }),
                    { headers: { 'Content-Type': 'application/json' } },
                );
            }

            if (request.method === 'POST') {
                try {
                    const body = (await request.json()) as NoteRequestBody;
                    if (!body.word) {
                        return new Response('Missing word', { status: 400 });
                    }

                    // If note is empty or just whitespace, delete the note
                    if (!body.note || !body.note.trim()) {
                        await env.DB.prepare(
                            'DELETE FROM notes WHERE user_id = ? AND word = ?',
                        )
                            .bind(userId, body.word)
                            .run();
                        return new Response('OK');
                    }

                    // Check if note already exists for this word
                    const exists = await env.DB.prepare(
                        'SELECT 1 FROM notes WHERE user_id = ? AND word = ?',
                    )
                        .bind(userId, body.word)
                        .first();

                    const now = new Date().toISOString();

                    if (exists) {
                        // Update existing note
                        await env.DB.prepare(
                            'UPDATE notes SET note = ?, updated_at = ? WHERE user_id = ? AND word = ?',
                        )
                            .bind(body.note, now, userId, body.word)
                            .run();
                    } else {
                        // Insert new note
                        await env.DB.prepare(
                            'INSERT INTO notes (user_id, word, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                        )
                            .bind(userId, body.word, body.note, now, now)
                            .run();
                    }

                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }

            if (request.method === 'DELETE') {
                try {
                    const body =
                        (await request.json()) as DeleteNoteRequestBody;
                    if (!body.word) {
                        return new Response('Missing word', { status: 400 });
                    }

                    await env.DB.prepare(
                        'DELETE FROM notes WHERE user_id = ? AND word = ?',
                    )
                        .bind(userId, body.word)
                        .run();

                    return new Response('OK');
                } catch {
                    return new Response('Invalid JSON', { status: 400 });
                }
            }
        }

        return env.ASSETS.fetch(request);
    },
};
