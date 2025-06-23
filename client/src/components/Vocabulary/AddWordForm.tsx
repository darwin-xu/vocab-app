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
        <div className="sm:bg-vocab-surface sm:backdrop-blur-xl sm:p-6 sm:rounded-xl sm:shadow-lg sm:border sm:border-white/20 mb-xl">
            <div className="add-word-form-layout flex flex-col sm:flex-row gap-0 sm:gap-4 sm:items-end">
                <div className="flex-1">
                    <Input
                        value={query}
                        onChange={onQueryChange}
                        placeholder="Search or enter a word to add..."
                        disabled={disabled}
                        onKeyDown={handleKeyPress}
                        className="rounded-t-lg rounded-b-none sm:rounded-lg"
                    />
                </div>
                <Button
                    onClick={selectedCount > 0 ? onRemove : onAdd}
                    disabled={
                        selectedCount > 0 ? false : !query.trim() || disabled
                    }
                    className={`py-3 rounded-t-none rounded-b-lg sm:rounded-lg ${
                        selectedCount > 0
                            ? 'bg-gradient-danger hover:bg-red-600'
                            : ''
                    }`}
                >
                    {selectedCount > 0
                        ? `Remove (${selectedCount})`
                        : 'Add Word'}
                </Button>
            </div>
        </div>
    );
}
