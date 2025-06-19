import { useState, useCallback } from 'react';
import { fetchVocab } from '../api';
import type { VocabItem } from '../types';

export function useVocabulary() {
    const [vocab, setVocab] = useState<VocabItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const loadVocab = useCallback(async (q: string, currentPage: number, pageSize: number) => {
        const data = await fetchVocab(q, currentPage, pageSize);
        setVocab(data.items || []);
        setTotalPages(Math.max(1, data.totalPages || 1));
        setSelected(new Set());
    }, []);

    const toggleSelect = useCallback((word: string) => {
        setSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(word)) {
                newSet.delete(word);
            } else {
                newSet.add(word);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelected(new Set(vocab.map(v => v.word)));
    }, [vocab]);

    const clearSelection = useCallback(() => {
        setSelected(new Set());
    }, []);

    return {
        vocab,
        page,
        setPage,
        totalPages,
        selected,
        loadVocab,
        toggleSelect,
        selectAll,
        clearSelection
    };
}
