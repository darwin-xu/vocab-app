// TTS control component for granular text-to-speech functionality
import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import {
    ttsCall,
    recordQueryHistory,
    getWordImage,
    generateWordImage,
    type WordImage,
} from '../api';
import {
    parseMarkdownForTTS,
    cleanTextForTTS,
    getSectionsByType,
} from '../utils/ttsParser';

interface TTSControlsProps {
    content: string;
    audioRef: React.MutableRefObject<HTMLAudioElement | null>;
    word?: string;
    visualReference?: VisualReference;
}

interface VisualReference {
    word: string;
    image_query: string;
}

const KNOWN_OBJECT_NOUN_IMAGE_QUERIES: Record<string, string> = {
    airplane: 'passenger airplane',
    aeroplane: 'passenger airplane',
    plane: 'passenger airplane',
    bicycle: 'bicycle',
    bike: 'bicycle',
    camera: 'camera',
    car: 'car',
    chair: 'chair',
    cup: 'cup',
    mug: 'mug',
    book: 'book',
    table: 'table',
    phone: 'smartphone',
    computer: 'computer',
    laptop: 'laptop',
    bottle: 'bottle',
    apple: 'apple fruit',
};

function parseVisualReference(line: string): VisualReference | null {
    const prefix = '<!-- vocab-image:';
    const suffix = ' -->';

    if (!line.startsWith(prefix) || !line.endsWith(suffix)) {
        return null;
    }

    try {
        return JSON.parse(line.slice(prefix.length, -suffix.length));
    } catch {
        return null;
    }
}

function getTitleWord(content: string): string | null {
    return content.match(/^#\s+(.+)$/m)?.[1]?.trim() || null;
}

function getKnownVisualReference(word: string | null): VisualReference | null {
    if (!word) return null;

    const imageQuery = KNOWN_OBJECT_NOUN_IMAGE_QUERIES[word.toLowerCase()];
    if (!imageQuery) return null;

    return {
        word,
        image_query: imageQuery,
    };
}

function WordImagePanel({ reference }: { reference: VisualReference }) {
    const [image, setImage] = useState<WordImage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        getWordImage(reference.word)
            .then((cachedImage) => {
                if (!cancelled) {
                    setImage(cachedImage);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Could not check saved image.');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [reference.word]);

    const handleGenerate = async (regenerate: boolean) => {
        try {
            setIsLoading(true);
            setError('');
            const generatedImage = await generateWordImage(
                reference.word,
                reference.image_query,
                regenerate,
            );
            setImage(generatedImage);
        } catch {
            setError('Could not generate image.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="my-2 max-w-sm">
            {image && (
                <img
                    src={image.image_data}
                    alt={reference.word}
                    className="aspect-video w-full rounded-md border border-white/20 object-cover shadow-sm"
                    decoding="async"
                    loading="eager"
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            )}
            <div className="mt-2 flex items-center gap-2">
                <button
                    type="button"
                    className="rounded-sm border border-vocab-border bg-white/90 px-3 py-1 text-xs font-semibold text-auth-text-dark shadow-xs transition-all duration-200 hover:border-vocab-primary hover:bg-vocab-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleGenerate(Boolean(image))}
                    disabled={isLoading}
                >
                    {isLoading
                        ? 'Generating...'
                        : image
                          ? 'Regenerate image'
                          : 'Generate image'}
                </button>
                {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
        </div>
    );
}

const TTSControls: React.FC<TTSControlsProps> = ({
    content,
    audioRef,
    word,
    visualReference,
}) => {
    const sections = parseMarkdownForTTS(content);
    const [isLoading, setIsLoading] = useState(false);
    const visualWord = word?.trim() || getTitleWord(content);
    const fallbackVisualReference =
        visualReference ??
        (content.includes('<!-- vocab-image:')
            ? null
            : getKnownVisualReference(visualWord));

    const playTTS = async (text: string) => {
        // Prevent multiple simultaneous requests
        if (isLoading) {
            return;
        }

        try {
            setIsLoading(true);

            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const cleanText = cleanTextForTTS(text);
            const b64 = await ttsCall(cleanText);

            // Record TTS query history if word is available (skip in test environment)
            if (word && process.env.NODE_ENV !== 'test') {
                recordQueryHistory(word, 'tts');
            }

            const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
            audioRef.current = audio;
            await audio.play();
        } catch (err) {
            console.error('Error playing TTS:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const TTSSpeakerIcon: React.FC<{ onClick: () => void; title: string }> = ({
        onClick,
        title,
    }) => (
        <button
            className={`inline-flex items-center justify-center min-w-5 h-4 ml-1 align-middle rounded-xs bg-gradient-primary text-xs text-white shadow-sm transition-all duration-200 ${
                isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'opacity-80 hover:-translate-y-px hover:shadow-md hover:opacity-100 active:translate-y-0'
            }`}
            onClick={(e) => {
                e.stopPropagation();
                if (!isLoading) {
                    onClick();
                }
            }}
            title={isLoading ? 'Loading audio...' : title}
            aria-label={isLoading ? 'Loading audio...' : title}
            disabled={isLoading}
        >
            {isLoading ? '⏳' : '🔊'}
        </button>
    );

    // Enhanced markdown rendering with inline TTS buttons
    const renderContentWithTTS = () => {
        const lines = content.split('\n');
        const renderedLines: React.ReactNode[] = [];

        if (visualWord && fallbackVisualReference) {
            renderedLines.push(
                <WordImagePanel
                    key="fallback-visual"
                    reference={fallbackVisualReference}
                />,
            );
        }

        // Get sections for quick lookup
        const pronunciations = getSectionsByType(sections, 'pronunciation');
        const definitions = getSectionsByType(sections, 'definition');
        const examples = getSectionsByType(sections, 'examples');
        const synonyms = getSectionsByType(sections, 'synonyms');

        let currentPartOfSpeech = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) {
                renderedLines.push(<br key={`br-${i}`} />);
                continue;
            }

            const visualReference = parseVisualReference(line);
            if (visualReference) {
                renderedLines.push(
                    <WordImagePanel
                        key={`visual-${i}`}
                        reference={visualReference}
                    />,
                );
                continue;
            }

            // Word title - skip rendering since the hover window appears when clicking the word
            if (line.startsWith('# ')) {
                // Add the full definition TTS button to the first actual content line instead
                // We'll handle this when we encounter the first meaningful content
                continue;
            }

            // Pronunciation
            if (line.startsWith('**Pronunciation:**')) {
                const pronunciation = pronunciations[0];
                const htmlContent = marked.parseInline(line);
                renderedLines.push(
                    <p
                        key={`pronunciation-${i}`}
                        className="flex items-center justify-between"
                    >
                        <span
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                        {pronunciation && (
                            <TTSSpeakerIcon
                                onClick={() => playTTS(pronunciation.content)}
                                title="Listen to pronunciation"
                            />
                        )}
                    </p>,
                );
                continue;
            }

            // Part of speech headers
            if (line.startsWith('## ') && !line.includes('Synonyms')) {
                currentPartOfSpeech = line.replace('## ', '').trim();
                const htmlContent = marked(line);
                renderedLines.push(
                    <div
                        key={`h2-${i}`}
                        className="text-lg font-semibold text-vocab-primary mt-2 mb-1 first:mt-0"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />,
                );
                continue;
            }

            // Synonyms header
            if (line.startsWith('## Synonyms')) {
                const htmlContent = marked(line);
                renderedLines.push(
                    <div
                        key={`synonyms-header-${i}`}
                        className="text-lg font-semibold text-vocab-primary mt-2 mb-1 flex items-center gap-1"
                    >
                        <span
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                        {synonyms.length > 0 && (
                            <TTSSpeakerIcon
                                onClick={() => playTTS(synonyms[0].content)}
                                title="Listen to synonyms"
                            />
                        )}
                    </div>,
                );
                continue;
            }

            // Definition
            if (line.startsWith('**Definition:**')) {
                const definition = definitions.find(
                    (def) => def.partOfSpeech === currentPartOfSpeech,
                );
                const htmlContent = marked.parseInline(line);
                renderedLines.push(
                    <p
                        key={`definition-${i}`}
                        className="flex items-center justify-between"
                    >
                        <span
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                        {definition && (
                            <TTSSpeakerIcon
                                onClick={() => playTTS(definition.content)}
                                title={`Listen to ${currentPartOfSpeech.toLowerCase()} definition`}
                            />
                        )}
                    </p>,
                );
                continue;
            }

            // Examples header
            if (line.startsWith('**Examples:**')) {
                const example = examples.find(
                    (ex) => ex.partOfSpeech === currentPartOfSpeech,
                );
                const htmlContent = marked.parseInline(line);
                renderedLines.push(
                    <p
                        key={`examples-header-${i}`}
                        className="flex items-center justify-between"
                    >
                        <span
                            dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                        {example && (
                            <TTSSpeakerIcon
                                onClick={() => playTTS(example.content)}
                                title={`Listen to ${currentPartOfSpeech.toLowerCase()} examples`}
                            />
                        )}
                    </p>,
                );
                continue;
            }

            // List items (bullet points)
            if (line.startsWith('- ')) {
                const htmlContent = marked(line);
                renderedLines.push(
                    <div
                        key={`list-item-${i}`}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />,
                );
                continue;
            }

            // Regular content (other inline elements)
            const htmlContent = marked.parseInline(line);
            renderedLines.push(
                <p
                    key={`content-${i}`}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />,
            );
        }

        return renderedLines;
    };

    return <div className="space-y-1">{renderContentWithTTS()}</div>;
};

export default TTSControls;
