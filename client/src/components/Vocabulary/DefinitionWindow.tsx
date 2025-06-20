import { useRef } from 'react';
import TTSControls from '../TTSControls';

interface DefinitionWindowProps {
    isVisible: boolean;
    x: number;
    y: number;
    content: string;
}

export function DefinitionWindow({
    isVisible,
    x,
    y,
    content,
}: DefinitionWindowProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    if (!isVisible) return null;

    return (
        <div
            className="fixed bg-vocab-surface backdrop-blur-xl text-auth-text-dark border border-white/20 rounded-lg shadow-xl p-lg z-[3000] text-base font-inter break-words leading-relaxed cursor-pointer max-w-screen-md min-w-96 animate-hoverFadeIn md:max-w-none md:min-w-auto md:w-auto md:left-auto md:right-auto md:top-auto md:transform-none md:max-h-none md:overflow-visible md:animate-hoverFadeIn"
            style={{
                left: window.innerWidth <= 768 ? 16 : x,
                top: window.innerWidth <= 768 ? '50%' : y,
                right: window.innerWidth <= 768 ? 16 : 'auto',
                transform:
                    window.innerWidth <= 768 ? 'translateY(-50%)' : 'none',
                maxHeight: window.innerWidth <= 768 ? '70vh' : 'none',
                overflowY: window.innerWidth <= 768 ? 'auto' : 'visible',
            }}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <TTSControls content={content} audioRef={audioRef} />
        </div>
    );
}
