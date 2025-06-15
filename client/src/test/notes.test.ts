// client/src/test/notes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../api';

// Mock fetch
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

describe('Notes API functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('test-token');
    });

    describe('getNote', () => {
        it('should fetch note for a word', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ note: 'Test note content' }),
            };
            mockFetch.mockResolvedValue(mockResponse);

            const result = await api.getNote('hello');

            expect(mockFetch).toHaveBeenCalledWith('/notes?word=hello', {
                headers: expect.any(Headers),
            });
            expect(result).toEqual({ note: 'Test note content' });
        });

        it('should handle words with special characters', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({ note: null }),
            };
            mockFetch.mockResolvedValue(mockResponse);

            await api.getNote('café & restaurant');

            expect(mockFetch).toHaveBeenCalledWith(
                '/notes?word=caf%C3%A9%20%26%20restaurant',
                {
                    headers: expect.any(Headers),
                },
            );
        });

        it('should handle API errors', async () => {
            const mockResponse = {
                ok: false,
                text: vi.fn().mockResolvedValue('Not found'),
            };
            mockFetch.mockResolvedValue(mockResponse);

            await expect(api.getNote('nonexistent')).rejects.toThrow(
                'Not found',
            );
        });
    });

    describe('saveNote', () => {
        it('should save a note for a word', async () => {
            const mockResponse = {
                ok: true,
            };
            mockFetch.mockResolvedValue(mockResponse);

            await api.saveNote('hello', 'This is my note');

            expect(mockFetch).toHaveBeenCalledWith(
                '/notes',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.any(Headers),
                    body: JSON.stringify({
                        word: 'hello',
                        note: 'This is my note',
                    }),
                }),
            );
        });

        it('should handle save errors', async () => {
            const mockResponse = {
                ok: false,
                text: vi.fn().mockResolvedValue('Failed to save note'),
            };
            mockFetch.mockResolvedValue(mockResponse);

            await expect(api.saveNote('hello', 'note')).rejects.toThrow(
                'Failed to save note',
            );
        });

        it('should save notes with special characters', async () => {
            const mockResponse = {
                ok: true,
            };
            mockFetch.mockResolvedValue(mockResponse);

            await api.saveNote('test', 'Note with émojis 🎉 and symbols @#$%');

            expect(mockFetch).toHaveBeenCalledWith(
                '/notes',
                expect.objectContaining({
                    body: JSON.stringify({
                        word: 'test',
                        note: 'Note with émojis 🎉 and symbols @#$%',
                    }),
                }),
            );
        });
    });

    describe('deleteNote', () => {
        it('should delete a note for a word', async () => {
            const mockResponse = {
                ok: true,
            };
            mockFetch.mockResolvedValue(mockResponse);

            await api.deleteNote('hello');

            expect(mockFetch).toHaveBeenCalledWith(
                '/notes',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: expect.any(Headers),
                    body: JSON.stringify({
                        word: 'hello',
                    }),
                }),
            );
        });

        it('should handle delete errors', async () => {
            const mockResponse = {
                ok: false,
                text: vi.fn().mockResolvedValue('Failed to delete note'),
            };
            mockFetch.mockResolvedValue(mockResponse);

            await expect(api.deleteNote('hello')).rejects.toThrow(
                'Failed to delete note',
            );
        });
    });
});
