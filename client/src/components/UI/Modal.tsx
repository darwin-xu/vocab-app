import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    className = '',
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto animate-modalFadeIn ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800">
                            {title}
                        </h2>
                    </div>
                )}
                <div className="modal-content">{children}</div>
            </div>
        </div>
    );
}
