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
    onKeyDown 
}: InputProps) {
    const baseClasses = "w-full px-4 py-3 border-2 border-vocab-border rounded-lg font-montserrat text-auth-text-dark transition-all duration-200 bg-white/90 backdrop-blur-sm";
    const focusClasses = "focus:border-vocab-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-vocab-primary/20";
    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "hover:border-vocab-primary/50";
    
    const finalClasses = `${baseClasses} ${focusClasses} ${disabledClasses} ${className}`;

    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={finalClasses}
            disabled={disabled}
            onKeyDown={onKeyDown}
        />
    );
}
