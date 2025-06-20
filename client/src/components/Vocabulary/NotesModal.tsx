import React from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';

interface NotesModalProps {
    isOpen: boolean;
    word: string;
    note: string;
    onNoteChange: (note: string) => void;
    onSave: () => void;
    onClose: () => void;
}

export function NotesModal({
    isOpen,
    word,
    note,
    onNoteChange,
    onSave,
    onClose,
}: NotesModalProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            onSave();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
            <div className="p-6 relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold w-6 h-6 flex items-center justify-center"
                >
                    ×
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-4 pr-8">
                    Notes for "{word}"
                </h2>
                <div className="mb-4">
                    <label
                        htmlFor="note-textarea"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Add your notes about this word:
                    </label>
                    <textarea
                        id="note-textarea"
                        value={note}
                        onChange={(e) => onNoteChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your note here..."
                        className="w-full h-32 px-3 py-2 border border-vocab-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vocab-primary/20 focus:border-vocab-primary resize-none"
                        autoFocus
                    />
                </div>

                <div className="text-xs text-gray-500 mb-4">
                    Tip: Press Cmd/Ctrl + Enter to save quickly
                </div>

                <div className="flex justify-end gap-3">
                    <Button onClick={onSave}>Save</Button>
                </div>
            </div>
        </Modal>
    );
}
