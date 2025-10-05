import { useRef } from 'react';
import TTSControls from '../TTSControls';

interface DefinitionWindowProps {
    isVisible: boolean;
    x: number;
    y: number;
    content: string;
    word?: string;
}

export function DefinitionWindow({
    isVisible,
    x,
    y,
    content,
    word,
}: DefinitionWindowProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

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
            <TTSControls content={content} audioRef={audioRef} word={word} />
        </div>
    );
}
