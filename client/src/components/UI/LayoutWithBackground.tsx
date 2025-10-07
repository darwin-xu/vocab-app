interface LayoutWithBackgroundProps {
    children: React.ReactNode;
    onClick?: () => void;
}

export function LayoutWithBackground({
    children,
    onClick,
}: LayoutWithBackgroundProps) {
    return (
        <div
            className="min-h-screen font-inter text-auth-text-dark leading-relaxed relative bg-gradient-primary"
            onClick={onClick}
        >
            {children}
        </div>
    );
}
