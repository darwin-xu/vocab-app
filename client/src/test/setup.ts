import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach } from 'vitest';

// Mock localStorage immediately - this should be available in jsdom
const createLocalStorageMock = () => {
    const storage: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => storage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            storage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete storage[key];
        }),
        clear: vi.fn(() => {
            for (const key in storage) {
                delete storage[key];
            }
        }),
        get length() {
            return Object.keys(storage).length;
        },
        key: vi.fn((index: number) => {
            const keys = Object.keys(storage);
            return keys[index] || null;
        }),
    };
};

// Mock speechSynthesis
const speechSynthesisMock = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
};

// Create the mock
const localStorageMock = createLocalStorageMock();

// Ensure these are available globally before any tests run
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
        configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
        value: speechSynthesisMock,
        writable: true,
        configurable: true,
    });
}

// Also define on globalThis for good measure
Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
});

Object.defineProperty(globalThis, 'speechSynthesis', {
    value: speechSynthesisMock,
    writable: true,
    configurable: true,
});

// Mock fetch
Object.defineProperty(globalThis, 'fetch', {
    value: vi.fn(),
    writable: true,
    configurable: true,
});

// Ensure mocks are set up before all tests
beforeAll(() => {
    // Ensure localStorage is available
    if (typeof localStorage === 'undefined') {
        Object.defineProperty(globalThis, 'localStorage', {
            value: localStorageMock,
            writable: true,
            configurable: true,
        });
    }
});

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
});
