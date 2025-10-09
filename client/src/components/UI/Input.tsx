import React from 'react';

interface InputProps {
    type?: 'text' | 'password' | 'email';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Input({
    type = 'text',
    value,
    onChange,
    placeholder,
    className = '',
    disabled,
    onKeyDown,
}: InputProps) {
    const baseClasses =
        'w-full py-3 border-2 border-vocab-border rounded-lg font-montserrat text-auth-text-dark transition-all duration-200 bg-white/90 backdrop-blur-sm';
    const paddingClasses = value && !disabled ? 'pl-4 pr-11' : 'px-4';
    const focusClasses =
        'focus:border-vocab-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-vocab-primary/20';
    const disabledClasses = disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'hover:border-vocab-primary/50';

    const finalClasses = `${baseClasses} ${paddingClasses} ${focusClasses} ${disabledClasses} ${className}`;

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={finalClasses}
                disabled={disabled}
                onKeyDown={onKeyDown}
            />
            {value && !disabled && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                    aria-label="Clear input"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}
