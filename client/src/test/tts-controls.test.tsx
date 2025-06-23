// Test for TTSControls component with simplified tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
            content="# Test Word\n\n**Pronunciation:** /test/\n\n## Noun\n\n**Definition:** A test word."
            audioRef={audioRef}
        />
    );
};

describe('TTSControls Component', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
    });

    it('should render without crashing', async () => {
        const { container } = render(<TestWrapper />);
        
        // Just check that the component renders the main div
        expect(container.querySelector('.space-y-1')).toBeInTheDocument();
    });

    it('should render component container', async () => {
        const { container } = render(<TestWrapper />);
        
        // Should have the space-y-1 class
        expect(container.querySelector('.space-y-1')).toBeInTheDocument();
    });

    it('should handle empty content gracefully', async () => {
        const EmptyTestWrapper = () => {
            const audioRef = useRef<HTMLAudioElement | null>(null);
            return <TTSControls content="" audioRef={audioRef} />;
        };
        
        const { container } = render(<EmptyTestWrapper />);
        
        // Should render without errors even with empty content
        expect(container.querySelector('.space-y-1')).toBeInTheDocument();
    });
});
