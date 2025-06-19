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
    onClose 
}: NotesModalProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            onSave();
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            title={`Notes for "${word}"`}
            className="max-w-lg"
        >
            <div className="p-6">
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
                        placeholder="Enter your notes here..."
                        className="w-full h-32 px-3 py-2 border border-vocab-border rounded-lg focus:outline-none focus:ring-2 focus:ring-vocab-primary/20 focus:border-vocab-primary resize-none"
                        autoFocus
                    />
                </div>
                
                <div className="text-xs text-gray-500 mb-4">
                    Tip: Press Cmd/Ctrl + Enter to save quickly
                </div>
                
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <Button onClick={onSave}>
                        Save
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
