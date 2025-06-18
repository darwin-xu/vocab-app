// TTS control component for granular text-to-speech functionality
import React from 'react';
import { marked } from 'marked';
import { ttsCall } from '../api';
import {
    parseMarkdownForTTS,
    cleanTextForTTS,
    getSectionsByType,
} from '../utils/ttsParser';

interface TTSControlsProps {
    content: string;
    audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const TTSControls: React.FC<TTSControlsProps> = ({ content, audioRef }) => {
    const sections = parseMarkdownForTTS(content);

    const playTTS = async (text: string) => {
        try {
            // Stop any currently playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const cleanText = cleanTextForTTS(text);
            const b64 = await ttsCall(cleanText);
            const audio = new Audio(`data:audio/wav;base64,${b64}`);
            audioRef.current = audio;
            await audio.play();
        } catch (err) {
            console.error('Error playing TTS:', err);
        }
    };

    const TTSSpeakerIcon: React.FC<{ onClick: () => void; title: string }> = ({
        onClick,
        title,
    }) => (
        <button
            className="inline-flex items-center justify-center min-w-[20px] h-4 ml-1 align-middle rounded-sm bg-gradient-to-tr from-indigo-500 to-purple-700 text-xs text-white opacity-80 shadow transition hover:-translate-y-px hover:shadow-md hover:opacity-100 active:translate-y-0"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title={title}
            aria-label={title}
        >
            🔊
        </button>
    );

    // Enhanced markdown rendering with inline TTS buttons
    const renderContentWithTTS = () => {
        const lines = content.split('\n');
        const renderedLines: React.ReactNode[] = [];

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

            // Word title
            if (line.startsWith('# ')) {
                const wordTitle = line.replace('# ', '');
                renderedLines.push(
                    <h1 key={`h1-${i}`} className="flex items-center gap-1">
                        {wordTitle}
                        <TTSSpeakerIcon
                            onClick={() => playTTS(content)}
                            title="Listen to full definition"
                        />
                    </h1>,
                );
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
                const htmlContent = marked.parseInline(line);
                renderedLines.push(
                    <h2
                        key={`h2-${i}`}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />,
                );
                continue;
            }

            // Synonyms header
            if (line.startsWith('## Synonyms')) {
                const htmlContent = marked.parseInline(line);
                renderedLines.push(
                    <h2
                        key={`synonyms-header-${i}`}
                        className="flex items-center gap-1"
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
                    </h2>,
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

            // Regular content (bullet points, etc.)
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

    return <div className="space-y-2">{renderContentWithTTS()}</div>;
};

export default TTSControls;
