import React from 'react';
import type { VocabItem } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface VocabTableProps {
    vocab: VocabItem[];
    selected: Set<string>;
    onToggleSelect: (word: string) => void;
    onWordClick: (e: React.MouseEvent, word: string) => void;
    onNotesClick: (word: string, note: string) => void;
    onDictionaryClick: (
        e: React.MouseEvent,
        word: string,
        dictType: 1 | 2,
    ) => void;
}

export function VocabTable({
    vocab,
    selected,
    onToggleSelect,
    onWordClick,
    onNotesClick,
    onDictionaryClick,
}: VocabTableProps) {
    return (
        <table className="w-full border-collapse mb-2xl bg-vocab-surface backdrop-blur-xl rounded-xl overflow-hidden shadow-lg border border-white/20">
            <thead className="bg-gradient-secondary text-white uppercase text-sm font-bold tracking-wider">
                <tr>
                    <th className="w-6 text-center py-3 px-1 border-b border-vocab-border-light">
                        {/* Checkbox column */}
                    </th>
                    <th className="w-45 min-w-37.5 py-3 px-1 text-left border-b border-vocab-border-light">
                        Word
                    </th>
                    <th className="w-auto min-w-50 max-w-100 py-3 px-4 text-left border-b border-vocab-border-light">
                        Notes
                    </th>
                    <th className="w-2 text-center py-3 px-2 border-b border-vocab-border-light">
                        {/* Dictionary button 1 */}
                    </th>
                    <th className="w-2 text-center py-3 px-2 border-b border-vocab-border-light">
                        {/* Dictionary button 2 */}
                    </th>
                    <th className="w-20 text-right py-3 px-4 border-b border-vocab-border-light">
                        Added
                    </th>
                </tr>
            </thead>
            <tbody>
                {(vocab || []).map((item, index) => (
                    <tr
                        key={item.word}
                        className={`transition-all duration-200 ${
                            index % 2 === 0 ? 'bg-white/70' : 'bg-vocab-bg/80'
                        } hover:bg-vocab-surface-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]`}
                    >
                        <td className="w-6 text-center py-2 px-3 border-b border-vocab-border-light">
                            <input
                                type="checkbox"
                                checked={selected.has(item.word)}
                                onChange={() => onToggleSelect(item.word)}
                                className="appearance-none w-3 h-3 border-2 border-vocab-border rounded-none bg-white/90 cursor-pointer transition-all duration-200 relative m-0 hover:border-vocab-primary hover:bg-white hover:scale-105 checked:bg-gradient-primary checked:border-vocab-primary after:checked:content-['✓'] after:checked:absolute after:checked:top-1/2 after:checked:left-1/2 after:checked:transform after:checked:-translate-x-1/2 after:checked:-translate-y-1/2 after:checked:text-white after:checked:text-xs after:checked:font-bold"
                            />
                        </td>
                        <td className="w-45 min-w-37.5 py-2 px-0 border-b border-vocab-border-light">
                            <span
                                className="font-montserrat font-semibold text-auth-text-dark cursor-pointer py-1 px-2 rounded-sm transition-all duration-200 inline-block text-base leading-tight hover:bg-gradient-primary hover:text-white hover:-translate-y-px hover:shadow-sm"
                                onClick={(e) => onWordClick(e, item.word)}
                            >
                                {item.word}
                            </span>
                        </td>
                        <td className="w-auto min-w-50 py-2 px-4 border-b border-vocab-border-light">
                            <div className="flex items-center gap-xs w-full">
                                <span
                                    className="flex-1 cursor-pointer text-sm leading-relaxed text-auth-text-dark transition-colors duration-200 break-words hover:text-vocab-primary"
                                    onClick={() =>
                                        onNotesClick(item.word, item.note || '')
                                    }
                                >
                                    {item.note ? (
                                        item.note.length > 50 ? (
                                            `${item.note.substring(0, 50)}...`
                                        ) : (
                                            item.note
                                        )
                                    ) : (
                                        <span className="text-auth-text-medium italic text-xs">
                                            Click to add note
                                        </span>
                                    )}
                                </span>
                                <button
                                    className={`notes-btn flex-shrink-0 w-6 h-6 min-w-6 p-1 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm ${item.note ? 'has-note' : 'no-note'}`}
                                    onClick={() =>
                                        onNotesClick(item.word, item.note || '')
                                    }
                                    title="Add/Edit Note"
                                >
                                    📝
                                </button>
                            </div>
                        </td>
                        <td className="w-2 text-center py-2 px-2 border-b border-vocab-border-light">
                            <button
                                className="w-7 h-7 p-1 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm"
                                onClick={(e) =>
                                    onDictionaryClick(e, item.word, 1)
                                }
                                title="Merriam-Webster Dictionary"
                            >
                                🔍
                            </button>
                        </td>
                        <td className="w-2 text-center py-2 px-2 border-b border-vocab-border-light">
                            <button
                                className="w-7 h-7 p-1 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm"
                                onClick={(e) =>
                                    onDictionaryClick(e, item.word, 2)
                                }
                                title="Cambridge Dictionary"
                            >
                                📖
                            </button>
                        </td>
                        <td className="w-20 text-right py-2 px-4 border-b border-vocab-border-light">
                            <span className="text-xs font-medium text-auth-text-medium tabular-nums">
                                {formatRelativeTime(item.add_date)}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
