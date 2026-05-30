import type { ReactNode } from 'react';

interface LayoutWithBackgroundProps {
    children: ReactNode;
    onClick?: () => void;
}

export function LayoutWithBackground({
    children,
    onClick,
}: LayoutWithBackgroundProps) {
    const versionText = `Version ${__APP_VERSION_DATE__} (${__APP_BUILD_NUMBER__}), developer by darwin and eric, deployed on ${__APP_DEPLOY_DATE__}`;

    return (
        <div
            className="min-h-screen font-inter text-auth-text-dark leading-relaxed bg-gradient-primary flex flex-col"
            onClick={onClick}
        >
            <div className="relative w-full">{children}</div>
            <footer className="w-full text-center text-white/70 text-xs sm:text-sm mt-3 py-2">
                {versionText}
            </footer>
        </div>
    );
}
