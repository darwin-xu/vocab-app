// Test for TTSControls component with simplified tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import TTSControls from '../components/TTSControls';
import { getWordImage, generateWordImage } from '../api';

// Mock the API module
vi.mock('../api', () => ({
    ttsCall: vi.fn(),
    getWordImage: vi.fn(),
    generateWordImage: vi.fn(),
    recordQueryHistory: vi.fn(),
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
        sections.filter((s: { type: string }) => s.type === type),
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
        vi.mocked(getWordImage).mockResolvedValue(null);
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

    it('should render generate button for object noun images', async () => {
        const ImageTestWrapper = () => {
            const audioRef = useRef<HTMLAudioElement | null>(null);
            return (
                <TTSControls
                    content='<!-- vocab-image:{"word":"apple","image_query":"apple fruit"} -->'
                    audioRef={audioRef}
                />
            );
        };

        const { getByRole } = render(<ImageTestWrapper />);

        await waitFor(() =>
            expect(
                getByRole('button', { name: 'Generate image' }),
            ).toBeInTheDocument(),
        );
        expect(getWordImage).toHaveBeenCalledWith('apple');
    });

    it('should generate and display an object noun image', async () => {
        vi.mocked(generateWordImage).mockResolvedValue({
            word: 'apple',
            image_query: 'apple fruit',
            image_data: 'data:image/png;base64,abc',
            mime_type: 'image/png',
            model: 'google/gemini-2.5-flash-image',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
        });

        const ImageTestWrapper = () => {
            const audioRef = useRef<HTMLAudioElement | null>(null);
            return (
                <TTSControls
                    content='<!-- vocab-image:{"word":"apple","image_query":"apple fruit"} -->'
                    audioRef={audioRef}
                />
            );
        };

        const { getByAltText, getByRole } = render(<ImageTestWrapper />);

        await waitFor(() =>
            expect(
                getByRole('button', { name: 'Generate image' }),
            ).toBeInTheDocument(),
        );
        fireEvent.click(getByRole('button', { name: 'Generate image' }));

        await waitFor(() => expect(getByAltText('apple')).toBeInTheDocument());
        expect(getByAltText('apple')).toHaveAttribute(
            'src',
            'data:image/png;base64,abc',
        );
        expect(generateWordImage).toHaveBeenCalledWith(
            'apple',
            'apple fruit',
            false,
        );
    });

    it('should show a generate button for known object nouns even without a marker', async () => {
        const PlaneTestWrapper = () => {
            const audioRef = useRef<HTMLAudioElement | null>(null);
            return (
                <TTSControls
                    content="# plane\n\n## Noun\n\n**Definition:** A flying vehicle."
                    audioRef={audioRef}
                    word="plane"
                />
            );
        };

        const { getByRole } = render(<PlaneTestWrapper />);

        await waitFor(() =>
            expect(
                getByRole('button', { name: 'Generate image' }),
            ).toBeInTheDocument(),
        );
        expect(getWordImage).toHaveBeenCalledWith('plane');
    });

    it('should show a generate button for explicit visual reference props', async () => {
        const PlaneTestWrapper = () => {
            const audioRef = useRef<HTMLAudioElement | null>(null);
            return (
                <TTSControls
                    content="# plane\n\n## Noun\n\n**Definition:** A flying vehicle."
                    audioRef={audioRef}
                    visualReference={{
                        word: 'plane',
                        image_query: 'passenger airplane',
                    }}
                />
            );
        };

        const { getByRole } = render(<PlaneTestWrapper />);

        await waitFor(() =>
            expect(
                getByRole('button', { name: 'Generate image' }),
            ).toBeInTheDocument(),
        );
        expect(getWordImage).toHaveBeenCalledWith('plane');
    });
});
