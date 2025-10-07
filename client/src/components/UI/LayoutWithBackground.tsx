import { useMemo } from 'react';
import type { ReactNode } from 'react';

interface LayoutWithBackgroundProps {
    children: ReactNode;
    onClick?: () => void;
}

export function LayoutWithBackground({
    children,
    onClick,
}: LayoutWithBackgroundProps) {
    const buildDisplay = useMemo(() => {
        const parsed = new Date(__APP_BUILD_TIME__);
        if (Number.isNaN(parsed.getTime())) {
            return __APP_BUILD_TIME__;
        }
        return parsed.toLocaleString();
    }, []);

    return (
        <div
            className="min-h-screen font-inter text-auth-text-dark leading-relaxed bg-gradient-primary flex flex-col"
            onClick={onClick}
        >
            <div className="relative w-full">{children}</div>
            <footer className="w-full text-center text-white/70 text-xs sm:text-sm mt-3 py-2">
                <span>Version {__APP_VERSION__}</span>
                <span className="mx-2 text-white/40">•</span>
                <span>Deployed {buildDisplay}</span>
            </footer>
        </div>
    );
}
