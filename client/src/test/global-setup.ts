// Global setup that runs before all tests and before any modules are loaded
import { vi } from 'vitest';

// Create localStorage mock
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

// Create mocks
const localStorageMock = createLocalStorageMock();

// Define globals immediately
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

Object.defineProperty(globalThis, 'fetch', {
    value: vi.fn(),
    writable: true,
    configurable: true,
});

export default function setup() {
    // This function is called once before all tests
    return () => {
        // Cleanup function (optional)
    };
}
