#!/usr/bin/env node

const baseUrl = process.env.VOCAB_APP_URL ?? 'http://localhost:8787';
const username = process.env.VOCAB_BENCH_USER ?? 'bench-user';
const password = process.env.VOCAB_BENCH_PASSWORD ?? 'bench-password';
const word = process.argv[2] ?? 'apple';
const runs = Number(process.env.VOCAB_BENCH_RUNS ?? 3);

async function postJson(path, body) {
    return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function ensureUser() {
    const registerResponse = await postJson('/register', {
        username,
        password,
    });

    if (!registerResponse.ok && registerResponse.status !== 409) {
        throw new Error(
            `Register failed: ${registerResponse.status} ${await registerResponse.text()}`,
        );
    }

    const loginResponse = await postJson('/login', { username, password });
    if (!loginResponse.ok) {
        throw new Error(
            `Login failed: ${loginResponse.status} ${await loginResponse.text()}`,
        );
    }

    const data = await loginResponse.json();
    return data.token;
}

const token = await ensureUser();
const timings = [];
const openRouterTimings = [];

for (let index = 0; index < runs; index += 1) {
    const started = performance.now();
    const response = await fetch(
        `${baseUrl}/openai?word=${encodeURIComponent(word)}&action=define`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    );
    const elapsed = Math.round(performance.now() - started);
    timings.push(elapsed);

    const openRouterDuration = Number(
        response.headers.get('x-openrouter-duration-ms') ?? NaN,
    );
    if (!Number.isNaN(openRouterDuration)) {
        openRouterTimings.push(openRouterDuration);
    }

    if (!response.ok) {
        console.error(
            `Run ${index + 1}: ${elapsed}ms, HTTP ${response.status}`,
        );
        console.error(await response.text());
        process.exit(1);
    }

    const output = await response.text();
    console.log(
        `Run ${index + 1}: total=${elapsed}ms openrouter=${response.headers.get('x-openrouter-duration-ms') ?? 'n/a'}ms output=${output.length} chars`,
    );
}

function summarize(label, values) {
    if (values.length === 0) return `${label}=n/a`;
    const sorted = [...values].sort((a, b) => a - b);
    const average = Math.round(
        values.reduce((total, timing) => total + timing, 0) / values.length,
    );
    return `${label}: avg=${average}ms min=${sorted[0]}ms max=${sorted[sorted.length - 1]}ms`;
}

console.log(summarize('Total', timings));
console.log(summarize('OpenRouter header', openRouterTimings));
