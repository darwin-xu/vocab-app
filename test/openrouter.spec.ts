import { env } from 'cloudflare:test';
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';
import {
    createAuthenticatedRequest,
    createTestUser,
    initializeTestDatabase,
} from './helpers/test-utils';

describe('OpenRouter gateway', () => {
    let userToken: string;
    let testEnv: Env;

    beforeAll(async () => {
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        await env.DB.prepare('DELETE FROM vocab').run();
        await env.DB.prepare('DELETE FROM users').run();

        const user = await createTestUser('openrouter-user', 'testpass');
        userToken = user.token;
        testEnv = {
            ...env,
            OPENROUTER_API_KEY: 'test-openrouter-key',
            OPENROUTER_BASE_URL: 'https://openrouter.test/api/v1',
            OPENROUTER_SITE_URL: 'https://vocab.example',
            OPENROUTER_APP_TITLE: 'Vocabulary Builder',
        };
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends definition requests to OpenRouter chat completions', async () => {
        const dictionaryJson = JSON.stringify({
            word: 'lucid',
            phonetic_symbol: '/LOO-sid/',
            meanings: [
                {
                    part_of_speech: 'adjective',
                    definition: 'Clear and easy to understand.',
                    examples: ['She gave a lucid explanation.'],
                },
            ],
            synonyms: ['clear'],
        });
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    choices: [{ message: { content: dictionaryJson } }],
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                },
            ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const request = createAuthenticatedRequest(
            'http://example.com/openai?word=lucid&action=define',
            userToken,
        );
        const response = await worker.fetch(request, testEnv);

        expect(response.status).toBe(200);
        expect(await response.text()).toContain('# lucid');
        expect(fetchMock).toHaveBeenCalledWith(
            'https://openrouter.test/api/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-openrouter-key',
                    'HTTP-Referer': 'https://vocab.example',
                    'X-OpenRouter-Title': 'Vocabulary Builder',
                }),
            }),
        );

        const [, requestInit] = fetchMock.mock.calls[0] as [
            string,
            RequestInit,
        ];
        const body = JSON.parse(requestInit.body as string) as {
            model: string;
            messages: Array<{ role: string; content: string }>;
            response_format: {
                type: string;
                json_schema: { name: string; strict: boolean };
            };
        };

        expect(body.model).toBe('openai/gpt-4.1-nano');
        expect(body.messages).toEqual([
            { role: 'user', content: "Define the word 'lucid'" },
        ]);
        expect(body.response_format).toMatchObject({
            type: 'json_schema',
            json_schema: {
                name: 'english_dictionary',
                strict: true,
            },
        });
    });

    it('sends TTS requests to OpenRouter speech', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
        vi.stubGlobal('fetch', fetchMock);

        const response = await worker.fetch(
            new Request('http://example.com/tts?text=hello'),
            testEnv,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ audio: 'AQID' });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://openrouter.test/api/v1/audio/speech',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-openrouter-key',
                }),
            }),
        );

        const [, requestInit] = fetchMock.mock.calls[0] as [
            string,
            RequestInit,
        ];
        expect(JSON.parse(requestInit.body as string)).toMatchObject({
            model: 'openai/gpt-4o-mini-tts-2025-12-15',
            input: 'hello',
            voice: 'alloy',
            response_format: 'mp3',
        });
    });
});
