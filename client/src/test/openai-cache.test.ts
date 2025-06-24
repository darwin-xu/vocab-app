// client/src/test/openai-cache.test.ts
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

describe('OpenAI Cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        localStorageMock.getItem.mockReturnValue('test-token');
        // Clear the cache before each test
        api._clearCacheForTesting();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should cache OpenAI responses and return cached result on subsequent calls', async () => {
        const mockResponse = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // First call should make API request
        const result1 = await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result1).toBe('Definition of hello');

        // Second call should return cached result without making API request
        const result2 = await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
        expect(result2).toBe('Definition of hello');
    });

    it('should cache different word/action combinations separately', async () => {
        const mockResponse1 = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        const mockResponse2 = {
            ok: true,
            text: vi.fn().mockResolvedValue('Example of hello'),
        };
        const mockResponse3 = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of world'),
        };

        mockFetch
            .mockResolvedValueOnce(mockResponse1)
            .mockResolvedValueOnce(mockResponse2)
            .mockResolvedValueOnce(mockResponse3);

        // Three different combinations should each make API calls
        const result1 = await api.openaiCall('hello', 'define');
        const result2 = await api.openaiCall('hello', 'example');
        const result3 = await api.openaiCall('world', 'define');

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result1).toBe('Definition of hello');
        expect(result2).toBe('Example of hello');
        expect(result3).toBe('Definition of world');

        // Calling the same combinations again should use cache
        await api.openaiCall('hello', 'define');
        await api.openaiCall('hello', 'example');
        await api.openaiCall('world', 'define');

        expect(mockFetch).toHaveBeenCalledTimes(3); // Still only 3 calls
    });

    it('should expire cache entries after 5 minutes', async () => {
        const mockResponse = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // First call
        await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward 4 minutes - should still use cache
        vi.advanceTimersByTime(4 * 60 * 1000);
        await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Fast forward to 6 minutes total - cache should expire
        vi.advanceTimersByTime(2 * 60 * 1000);
        await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle case-insensitive word caching', async () => {
        const mockResponse = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // Cache with lowercase
        await api.openaiCall('hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Request with uppercase should use same cache
        await api.openaiCall('HELLO', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Request with mixed case should use same cache
        await api.openaiCall('Hello', 'define');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not affect error responses', async () => {
        const mockErrorResponse = {
            ok: false,
            text: vi.fn().mockResolvedValue('API Error'),
        };
        mockFetch.mockResolvedValue(mockErrorResponse);

        // Error responses should not be cached
        await expect(api.openaiCall('hello', 'define')).rejects.toThrow(
            'API Error',
        );
        await expect(api.openaiCall('hello', 'define')).rejects.toThrow(
            'API Error',
        );

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on logout', async () => {
        const mockResponse = {
            ok: true,
            text: vi.fn().mockResolvedValue('Definition of hello'),
        };
        mockFetch.mockResolvedValue(mockResponse);

        // Mock window.location.reload to prevent actual reload during test
        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: mockReload },
            writable: true,
        });

        // Cache a response
        const result1 = await api.openaiCall('hello', 'define');
        expect(result1).toBe('Definition of hello');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call should use cache
        const result2 = await api.openaiCall('hello', 'define');
        expect(result2).toBe('Definition of hello');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

        // Logout should clear cache (but will throw due to reload, which we'll catch)
        try {
            await api.logout();
        } catch {
            // Expected - logout calls window.location.reload which we can't test properly
        }

        // After logout, same request should make new API call
        const result3 = await api.openaiCall('hello', 'define');
        expect(result3).toBe('Definition of hello');
        expect(mockFetch).toHaveBeenCalledTimes(4); // Now should be 4 calls (1 for openaiCall, 1 for logout, 1 for analytics, 1 for openaiCall)
    });
});
