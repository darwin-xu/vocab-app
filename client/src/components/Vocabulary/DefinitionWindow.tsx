import { useRef } from 'react';
import TTSControls from '../TTSControls';

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

interface DefinitionWindowProps {
    isVisible: boolean;
    x: number;
    y: number;
    content: string;
    word?: string;
    isLoading?: boolean;
}

export function DefinitionWindow({
    isVisible,
    x,
    y,
    content,
    word,
    isLoading,
}: DefinitionWindowProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const imageQuery = word
        ? KNOWN_OBJECT_NOUN_IMAGE_QUERIES[word.trim().toLowerCase()]
        : null;
    const shouldForceVisualReference =
        !isLoading && !content.includes('<!-- vocab-image:');

    if (!isVisible) return null;

    return (
        <div
            className="absolute bg-vocab-surface backdrop-blur-xl text-auth-text-dark border border-white/20 rounded-lg shadow-xl p-lg z-[3000] text-base font-inter break-words leading-relaxed cursor-pointer max-w-screen-md animate-hoverFadeIn"
            style={{
                left: window.innerWidth <= 768 ? 16 : x,
                top: window.innerWidth <= 768 ? y : y, // Use calculated y position for both mobile and desktop
                right: window.innerWidth <= 768 ? 16 : 'auto',
                // Remove height constraints to allow natural expansion
                maxHeight: window.innerWidth <= 768 ? 'none' : '90vh',
                overflowY: window.innerWidth <= 768 ? 'visible' : 'auto',
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <TTSControls
                content={content}
                audioRef={audioRef}
                word={word}
                visualReference={
                    shouldForceVisualReference && word && imageQuery
                        ? {
                              word,
                              image_query: imageQuery,
                          }
                        : undefined
                }
            />
        </div>
    );
}
