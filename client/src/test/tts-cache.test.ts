// client/src/test/tts-cache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch before importing the API module
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock setInterval to prevent the periodic cleanup from running during tests
vi.mock('setInterval', () => vi.fn());

// Import API after mocking
import * as api from '../api';

describe('TTS Cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        localStorageMock.getItem.mockReturnValue('test-token');
        // Clear the cache by calling the test helper
        api._clearCacheForTesting();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should cache TTS responses and return cached result on subsequent calls', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'base64audiodata' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // First call should make API request
        const result1 = await api.ttsCall('hello world');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result1).toBe('base64audiodata');

        // Second call should return cached result without making API request
        const result2 = await api.ttsCall('hello world');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
        expect(result2).toBe('base64audiodata');
    });

    it('should cache different text separately', async () => {
        const mockResponse1 = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'audio1' }),
        };
        const mockResponse2 = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'audio2' }),
        };

        mockFetch
            .mockResolvedValueOnce(mockResponse1)
            .mockResolvedValueOnce(mockResponse2);

        // Two different texts should each make API calls
        const result1 = await api.ttsCall('hello');
        const result2 = await api.ttsCall('world');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result1).toBe('audio1');
        expect(result2).toBe('audio2');

        // Calling the same texts again should use cache
        await api.ttsCall('hello');
        await api.ttsCall('world');

        expect(mockFetch).toHaveBeenCalledTimes(2); // Still only 2 calls
    });

    it('should expire cache entries after 5 minutes', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'base64audiodata' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // First call
        await api.ttsCall('hello');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward 4 minutes - should still use cache
        vi.advanceTimersByTime(4 * 60 * 1000);
        await api.ttsCall('hello');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward to 6 minutes total - cache should expire
        vi.advanceTimersByTime(2 * 60 * 1000);
        await api.ttsCall('hello');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle case-insensitive text caching', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'base64audiodata' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // Cache with lowercase
        await api.ttsCall('hello world');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Request with uppercase should use same cache
        await api.ttsCall('HELLO WORLD');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Request with mixed case should use same cache
        await api.ttsCall('Hello World');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not cache error responses', async () => {
        const mockErrorResponse = {
            ok: false,
            text: vi.fn().mockResolvedValue('TTS API Error'),
        };
        mockFetch.mockResolvedValue(mockErrorResponse);

        // Error responses should not be cached
        await expect(api.ttsCall('hello')).rejects.toThrow('TTS API Error');
        await expect(api.ttsCall('hello')).rejects.toThrow('TTS API Error');

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear TTS cache on logout', async () => {
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'base64audiodata' }),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // Mock window.location.reload to prevent actual reload during test
        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: mockReload },
            writable: true,
        });

        // Cache a response
        const result1 = await api.ttsCall('hello');
        expect(result1).toBe('base64audiodata');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call should use cache
        const result2 = await api.ttsCall('hello');
        expect(result2).toBe('base64audiodata');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

        // Logout should clear cache (but will throw due to reload, which we'll catch)
        try {
            await api.logout();
        } catch {
            // Expected - logout calls window.location.reload which we can't test properly
        }

        // After logout, same request should make new API call
        const result3 = await api.ttsCall('hello');
        expect(result3).toBe('base64audiodata');
        expect(mockFetch).toHaveBeenCalledTimes(4); // Now should be 4 calls (1 for ttsCall, 1 for logout, 1 for analytics, 1 for ttsCall)
    });

    it('should not interfere with OpenAI cache', async () => {
        const mockOpenAIResponse = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        const mockTTSResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ audio: 'base64audiodata' }),
        };

        mockFetch
            .mockResolvedValueOnce(mockOpenAIResponse)
            .mockResolvedValueOnce(mockTTSResponse);

        // Make both types of calls
        const openaiResult = await api.openaiCall('hello', 'define');
        const ttsResult = await api.ttsCall('hello');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(openaiResult).toBe('Definition of hello');
        expect(ttsResult).toBe('base64audiodata');

        // Both should be cached independently
        await api.openaiCall('hello', 'define');
        await api.ttsCall('hello');

        expect(mockFetch).toHaveBeenCalledTimes(2); // Still only 2 calls
    });
});
