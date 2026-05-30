#!/usr/bin/env node

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
    console.error('Set OPENROUTER_API_KEY before running this benchmark.');
    process.exit(1);
}

const model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4.1-nano';
const baseUrl =
    process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
const word = process.argv[2] ?? 'apple';
const runs = Number(process.env.OPENROUTER_BENCH_RUNS ?? 3);

const responseFormat = {
    type: 'json_schema',
    json_schema: {
        name: 'english_dictionary',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                word: { type: 'string' },
                phonetic_symbol: { type: 'string' },
                meanings: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: {
                        type: 'object',
                        properties: {
                            part_of_speech: {
                                type: 'string',
                                enum: [
                                    'noun',
                                    'verb',
                                    'adjective',
                                    'adverb',
                                    'pronoun',
                                    'preposition',
                                    'conjunction',
                                    'interjection',
                                ],
                            },
                            definition: { type: 'string' },
                            examples: {
                                type: 'array',
                                minItems: 1,
                                maxItems: 2,
                                items: { type: 'string' },
                            },
                        },
                        required: ['part_of_speech', 'definition', 'examples'],
                        additionalProperties: false,
                    },
                },
                synonyms: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 3,
                    items: { type: 'string' },
                },
                visual_reference: {
                    type: 'object',
                    properties: {
                        is_object_noun: { type: 'boolean' },
                        image_query: { type: 'string' },
                    },
                    required: ['is_object_noun', 'image_query'],
                    additionalProperties: false,
                },
            },
            required: [
                'word',
                'phonetic_symbol',
                'meanings',
                'synonyms',
                'visual_reference',
            ],
            additionalProperties: false,
        },
    },
};

const timings = [];

for (let index = 0; index < runs; index += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-OpenRouter-Title': 'Vocabulary Builder Latency Benchmark',
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: `Define the word '${word}'` }],
            response_format: responseFormat,
            max_tokens: 700,
            temperature: 0.2,
            provider: {
                sort: 'latency',
            },
        }),
    });
    const elapsed = Math.round(performance.now() - started);
    timings.push(elapsed);

    if (!response.ok) {
        console.error(
            `Run ${index + 1}: ${elapsed}ms, HTTP ${response.status}`,
        );
        console.error(await response.text());
        process.exit(1);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content ?? '';
    console.log(
        `Run ${index + 1}: ${elapsed}ms, ${output.length} output chars`,
    );
}

const sorted = [...timings].sort((a, b) => a - b);
const average = Math.round(
    timings.reduce((total, timing) => total + timing, 0) / timings.length,
);
console.log(
    `Model ${model}: avg=${average}ms min=${sorted[0]}ms max=${sorted[sorted.length - 1]}ms`,
);
