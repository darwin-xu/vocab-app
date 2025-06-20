import React from 'react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface AddWordFormProps {
    query: string;
    onQueryChange: (query: string) => void;
    onAdd: () => void;
    onRemove: () => void;
    selectedCount: number;
    disabled?: boolean;
}

export function AddWordForm({
    query,
    onQueryChange,
    onAdd,
    onRemove,
    selectedCount,
    disabled,
}: AddWordFormProps) {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && selectedCount === 0 && query.trim()) {
            onAdd();
        }
    };

    return (
        <div className="bg-vocab-surface backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/20 mb-xl">
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label
                        htmlFor="word-input"
                        className="block text-sm font-semibold text-auth-text-dark mb-2"
                    >
                        Search / Add New Word
                    </label>
                    <Input
                        value={query}
                        onChange={onQueryChange}
                        placeholder="Search or enter a word to add..."
                        disabled={disabled}
                        onKeyDown={handleKeyPress}
                    />
                </div>
                <Button
                    onClick={selectedCount > 0 ? onRemove : onAdd}
                    disabled={
                        selectedCount > 0 ? false : !query.trim() || disabled
                    }
                    className={
                        selectedCount > 0
                            ? 'bg-gradient-danger hover:bg-red-600'
                            : ''
                    }
                >
                    {selectedCount > 0
                        ? `Remove (${selectedCount})`
                        : 'Add Word'}
                </Button>
            </div>
        </div>
    );
}
