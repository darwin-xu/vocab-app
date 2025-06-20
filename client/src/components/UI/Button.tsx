import React from 'react';

interface ButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
}

export function Button({
    onClick,
    disabled,
    className = '',
    children,
    type = 'button',
}: ButtonProps) {
    const baseClasses =
        'font-montserrat font-semibold text-white px-6 py-2 rounded-lg transition-all duration-200 shadow-md';
    const enabledClasses =
        'bg-gradient-primary hover:bg-gradient-secondary hover:-translate-y-1 hover:shadow-lg active:translate-y-0';
    const disabledClasses = 'bg-gray-400 cursor-not-allowed';

    const finalClasses = `${baseClasses} ${disabled ? disabledClasses : enabledClasses} ${className}`;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={finalClasses}
        >
            {children}
        </button>
    );
}
