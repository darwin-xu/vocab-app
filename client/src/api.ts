// client/src/api.ts

const SESSION_TOKEN_KEY = 'sessionToken';
const USERNAME_KEY = 'username';

function getToken() {
    return localStorage.getItem(SESSION_TOKEN_KEY) || '';
}

function setToken(token: string) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
}

function authFetch(path: string, options: RequestInit = {}) {
    const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(path, { ...options, headers });
}

export async function login(username: string, password: string) {
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem(USERNAME_KEY, username);
}

export async function register(username: string, password: string) {
    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function fetchVocab(q = '', page = 1, pageSize = 20) {
    const res = await authFetch(`/vocab?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`);
    if (res.status === 401) throw new Error('Unauthorized');
    return res.json();
}

export async function addWord(word: string) {
    const res = await authFetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function removeWords(words: string[]) {
    const res = await authFetch('/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function openaiCall(word: string, func: string) {
    const res = await authFetch(`/openai?word=${encodeURIComponent(word)}&func=${func}`);
    if (!res.ok) throw new Error(await res.text());
    return res.text();
}

export async function ttsCall(text: string) {
    const res = await authFetch(`/tts?text=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.audio as string;
}

export function logout() {
    clearToken();
    window.location.reload();
}
