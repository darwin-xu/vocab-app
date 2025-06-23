// Test for TTSControls component with loading state fix
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import TTSControls from '../components/TTSControls';

// Mock the API module
vi.mock('../api', () => ({
    ttsCall: vi.fn(),
}));

// Mock the ttsParser module
vi.mock('../utils/ttsParser', () => ({
    parseMarkdownForTTS: vi.fn(() => [
        {
            type: 'pronunciation',
            content: 'test pronunciation',
        },
        {
            type: 'definition',
            content: 'test definition',
            partOfSpeech: 'noun',
        },
    ]),
    cleanTextForTTS: vi.fn((text) => text),
    getSectionsByType: vi.fn((sections, type) => 
        sections.filter((s: { type: string }) => s.type === type)
    ),
}));

// Mock marked
vi.mock('marked', () => ({
    marked: {
        parseInline: vi.fn((text) => text),
    },
}));

// Mock Audio constructor
const mockAudio = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
};

Object.defineProperty(global, 'Audio', {
    writable: true,
    value: vi.fn(() => mockAudio),
});

const TestWrapper = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    return (
        <TTSControls
            content="# Test Word\n\n**Pronunciation:** /test/"
            audioRef={audioRef}
        />
    );
};

describe('TTSControls Component', () => {
    let mockTtsCall: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const apiModule = vi.mocked(await import('../api'));
        mockTtsCall = apiModule.ttsCall;
    });

    it('should prevent multiple simultaneous TTS calls', async () => {
        let callCount = 0;
        
        // Mock ttsCall to track calls and delay resolution
        mockTtsCall.mockImplementation(() => {
            callCount++;
            return new Promise(resolve => setTimeout(() => resolve('audio'), 100));
        });

        render(<TestWrapper />);

        // Find the TTS button in the header
        const button = screen.getByTitle('Listen to full definition');
        
        // Click rapidly multiple times
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        // Wait a bit for any potential calls to be made
        await new Promise(resolve => setTimeout(resolve, 50));

        // Should only have been called once
        expect(callCount).toBe(1);

        // Wait for the call to complete
        await waitFor(() => {
            expect(button.textContent).toBe('🔊');
        }, { timeout: 200 });
    });

    it('should show loading state during API call', async () => {
        let resolveCall: (value: string) => void;
        const callPromise = new Promise<string>((resolve) => {
            resolveCall = resolve;
        });

        mockTtsCall.mockReturnValue(callPromise);

        render(<TestWrapper />);

        let button = screen.getByTitle('Listen to full definition');
        expect(button.textContent).toBe('🔊');

        // Click the button
        fireEvent.click(button);

        // Wait for the loading state to appear and get fresh button reference
        await waitFor(() => {
            button = screen.getByTitle('Loading audio...');
            expect(button.textContent).toBe('⏳');
        });
        
        expect(button).toHaveAttribute('disabled');

        // Resolve the call
        resolveCall!('audio');

        // Should return to normal state
        await waitFor(() => {
            button = screen.getByTitle('Listen to full definition');
            expect(button.textContent).toBe('🔊');
        });

        expect(button).not.toHaveAttribute('disabled');
    });

    it('should reset loading state on error', async () => {
        mockTtsCall.mockRejectedValue(new Error('API Error'));

        render(<TestWrapper />);

        let button = screen.getByTitle('Listen to full definition');

        // Click the button
        fireEvent.click(button);

        // Wait for the loading state to appear and get fresh button reference
        await waitFor(() => {
            button = screen.getByTitle('Loading audio...');
            expect(button.textContent).toBe('⏳');
        });

        // Should return to normal state after error
        await waitFor(() => {
            button = screen.getByTitle('Listen to full definition');
            expect(button.textContent).toBe('🔊');
        });

        expect(button).not.toHaveAttribute('disabled');
    });
});
