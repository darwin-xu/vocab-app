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
    const headers =
        options.headers instanceof Headers
            ? options.headers
            : new Headers(options.headers);
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(path, { ...options, headers });
}

export async function login(username: string, password: string) {
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem(USERNAME_KEY, username);
    localStorage.setItem('isAdmin', data.is_admin ? 'true' : 'false');
}

export async function register(username: string, password: string) {
    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function fetchVocab(q = '', page = 1, pageSize = 20) {
    const res = await authFetch(
        `/vocab?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
    );
    if (res.status === 401) throw new Error('Unauthorized');
    return res.json();
}

export async function addWord(word: string) {
    const res = await authFetch('/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function removeWords(words: string[]) {
    const res = await authFetch('/vocab', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function openaiCall(word: string, action: string) {
    const res = await authFetch(
        `/openai?word=${encodeURIComponent(word)}&action=${action}`,
    );
    if (!res.ok) throw new Error(await res.text());
    return res.text();
}

export async function ttsCall(text: string) {
    const res = await authFetch(`/tts?text=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.audio as string;
}

export async function fetchUsers() {
    const res = await authFetch('/admin/users');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function fetchUserDetails(userId: string) {
    const res = await authFetch(`/admin/users/${userId}`);
    if (!res.ok) throw new Error(await res.text());
    const userData = await res.json();
    return { user: userData }; // Wrap to match fetchOwnProfile format
}

export async function updateUserInstructions(
    userId: string,
    customInstructions: string,
) {
    const res = await authFetch(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: customInstructions }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function fetchOwnProfile() {
    const res = await authFetch('/profile');
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function updateOwnProfile(customInstructions: string) {
    const res = await authFetch('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: customInstructions }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function updateUserProfile(customInstructions: string | null) {
    const res = await authFetch('/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_instructions: customInstructions }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function getNote(word: string) {
    const res = await authFetch(`/notes?word=${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function saveNote(word: string, note: string) {
    const res = await authFetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, note }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export async function deleteNote(word: string) {
    const res = await authFetch('/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
    });
    if (!res.ok) throw new Error(await res.text());
}

export function isAdmin() {
    return localStorage.getItem('isAdmin') === 'true';
}

export function logout() {
    clearToken();
    localStorage.removeItem('isAdmin');
    window.location.reload();
}
