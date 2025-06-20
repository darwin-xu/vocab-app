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
            {/* Animated background pattern */}
            <div
                className="fixed inset-0 opacity-10 animate-float -z-10 pointer-events-none"
                style={{
                    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`,
                }}
            />
            {children}
        </div>
    );
}
