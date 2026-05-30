// client/src/api.ts
import { sessionAnalytics } from './utils/sessionAnalytics';
import { sessionMonitor } from './utils/sessionMonitor';

const SESSION_TOKEN_KEY = 'sessionToken';
const USERNAME_KEY = 'username';
const OPENAI_CACHE_VERSION = 'v2-word-images';

// Cache for OpenAI responses with 5-minute timeout
interface CacheEntry {
    data: string;
    timestamp: number;
}

class OpenAICache {
    private cache = new Map<string, CacheEntry>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

    private getCacheKey(word: string, action: string): string {
        return `${OPENAI_CACHE_VERSION}-${word.toLowerCase()}-${action}`;
    }

    private getTTSCacheKey(text: string): string {
        return `tts-${text.toLowerCase()}`;
    }

    get(word: string, action: string): string | null {
        const key = this.getCacheKey(word, action);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache entry has expired
        if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    getTTS(text: string): string | null {
        const key = this.getTTSCacheKey(text);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache entry has expired
        if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(word: string, action: string, data: string): void {
        const key = this.getCacheKey(word, action);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    setTTS(text: string, data: string): void {
        const key = this.getTTSCacheKey(text);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    clear(): void {
        this.cache.clear();
    }

    // Clean up expired entries (optional optimization)
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }

    // Get cache statistics for debugging
    getStats(): {
        totalEntries: number;
        validEntries: number;
        expiredEntries: number;
    } {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
        };
    }
}

const openaiCache = new OpenAICache();
const pendingOpenAIRequests = new Map<string, Promise<string>>();
const wordImageCache = new Map<string, WordImage | null>();

// Set up periodic cleanup of expired cache entries (every 10 minutes)
setInterval(
    () => {
        openaiCache.cleanup();
    },
    10 * 60 * 1000,
);

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

    // Record successful login and start session monitoring
    sessionAnalytics.setLoginTime();
    sessionMonitor.startHealthCheck();
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
    return sessionMonitor.wrapApiCall(async () => {
        const res = await authFetch(
            `/vocab?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`,
        );
        if (res.status === 401) {
            sessionAnalytics.recordLogout(
                'server_error',
                'Unauthorized response from fetchVocab',
                {
                    httpStatus: 401,
                    apiEndpoint: '/vocab',
                },
            );
            throw new Error('Unauthorized');
        }
        return res.json();
    }, '/vocab');
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
    const requestKey = `${word.toLowerCase()}-${action}`;

    // Check cache first
    const cachedResponse = openaiCache.get(word, action);
    if (cachedResponse) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 Cache hit for "${word}" (${action})`);
        }
        // Record history even for cached responses (skip in test environment)
        if (action === 'define' && process.env.NODE_ENV !== 'test') {
            recordQueryHistory(word, 'definition');
        }
        return cachedResponse;
    }

    const pendingRequest = pendingOpenAIRequests.get(requestKey);
    if (pendingRequest) {
        const responseData = await pendingRequest;
        if (action === 'define' && process.env.NODE_ENV !== 'test') {
            recordQueryHistory(word, 'definition');
        }
        return responseData;
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(
            `🌐 Cache miss for "${word}" (${action}) - fetching from API`,
        );
    }

    const request = (async () => {
        const res = await authFetch(
            `/openai?word=${encodeURIComponent(word)}&action=${action}`,
        );
        if (!res.ok) throw new Error(await res.text());
        const responseData = await res.text();

        // Store in cache
        openaiCache.set(word, action, responseData);
        if (process.env.NODE_ENV === 'development') {
            console.log(`💾 Cached response for "${word}" (${action})`);
        }

        return responseData;
    })();

    pendingOpenAIRequests.set(requestKey, request);

    let responseData: string;
    try {
        responseData = await request;
    } finally {
        pendingOpenAIRequests.delete(requestKey);
    }

    // Record history for definition queries (skip in test environment)
    if (action === 'define' && process.env.NODE_ENV !== 'test') {
        recordQueryHistory(word, 'definition');
    }

    return responseData;
}

export async function ttsCall(text: string) {
    // Check cache first
    const cachedResponse = openaiCache.getTTS(text);
    if (cachedResponse) {
        if (process.env.NODE_ENV === 'development') {
            console.log(
                `🎯 TTS Cache hit for "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
            );
        }
        return cachedResponse;
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(
            `🌐 TTS Cache miss for "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" - fetching from API`,
        );
    }
    const res = await authFetch(`/tts?text=${encodeURIComponent(text)}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const audioData = data.audio as string;

    // Store in cache
    openaiCache.setTTS(text, audioData);
    if (process.env.NODE_ENV === 'development') {
        console.log(
            `💾 Cached TTS response for "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
        );
    }

    return audioData;
}

export interface WordImage {
    word: string;
    image_query: string;
    image_data: string;
    mime_type: string;
    model: string;
    created_at: string;
    updated_at: string;
}

export async function getWordImage(word: string): Promise<WordImage | null> {
    const cacheKey = word.toLowerCase();
    if (wordImageCache.has(cacheKey)) {
        return wordImageCache.get(cacheKey) ?? null;
    }

    const res = await authFetch(`/word-image?word=${encodeURIComponent(word)}`);
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { image: WordImage | null };
    wordImageCache.set(cacheKey, data.image);
    return data.image;
}

export async function generateWordImage(
    word: string,
    imageQuery: string,
    regenerate = false,
): Promise<WordImage> {
    const res = await authFetch('/word-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            word,
            image_query: imageQuery,
            regenerate,
        }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { image: WordImage };
    wordImageCache.set(data.image.word.toLowerCase(), data.image);
    return data.image;
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

export async function logout() {
    // Record the logout event
    sessionAnalytics.recordLogout('manual', 'User initiated logout');

    // Stop health monitoring
    sessionMonitor.stopHealthCheck();

    // Call server logout endpoint to invalidate session
    try {
        await authFetch('/logout', { method: 'POST' });
    } catch (error) {
        console.warn('Failed to notify server of logout:', error);
    }

    // Clear all session data
    clearToken();
    localStorage.removeItem('isAdmin');
    openaiCache.clear(); // Clear OpenAI cache on logout
    pendingOpenAIRequests.clear();
    wordImageCache.clear();
    window.location.reload();
}

// Export for testing purposes only
export function _clearCacheForTesting() {
    openaiCache.clear();
    pendingOpenAIRequests.clear();
    wordImageCache.clear();
}

// Export for debugging purposes
export function _getCacheStats() {
    return openaiCache.getStats();
}

export async function recordQueryHistory(
    word: string,
    queryType: 'definition' | 'tts',
) {
    try {
        const res = await authFetch('/query-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, query_type: queryType }),
        });
        if (!res.ok) {
            console.warn('Failed to record query history:', await res.text());
        }
    } catch (error) {
        console.warn('Error recording query history:', error);
    }
}

export async function getQueryHistory(word: string) {
    try {
        const res = await authFetch(
            `/query-history?word=${encodeURIComponent(word)}`,
        );
        if (!res.ok) {
            // Try to get error message from JSON response
            try {
                const errorData = await res.json();
                if (errorData.error) {
                    throw new Error(errorData.error);
                }
            } catch {
                // If JSON parsing fails, use status text
                throw new Error(`Failed to fetch history (${res.status})`);
            }
        }
        return res.json();
    } catch (error) {
        console.error('Error fetching query history:', error);
        // Return empty history on error instead of throwing
        return { history: [] };
    }
}
