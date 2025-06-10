import '@testing-library/jest-dom';

// Create the localStorage mock IMMEDIATELY (without vitest imports that cause issues)
const createLocalStorageMock = () => {
    const storage: Record<string, string> = {};
    return {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => {
            storage[key] = value;
        },
        removeItem: (key: string) => {
            delete storage[key];
        },
        clear: () => {
            for (const key in storage) {
                delete storage[key];
            }
        },
        get length() {
            return Object.keys(storage).length;
        },
        key: (index: number) => {
            const keys = Object.keys(storage);
            return keys[index] || null;
        },
    };
};

// Mock speechSynthesis
const speechSynthesisMock = {
    speak: () => { },
    cancel: () => { },
    getVoices: () => [],
};

// Create the mocks immediately
const localStorageMock = createLocalStorageMock();

// Define localStorage globally as soon as this module loads
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

// Mock fetch with a simple function
Object.defineProperty(globalThis, 'fetch', {
    value: () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    }),
    writable: true,
    configurable: true,
});

// Also set it on window if it exists
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
