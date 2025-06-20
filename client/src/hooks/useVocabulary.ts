import { useState, useCallback, useRef } from 'react';
import {
    fetchVocab,
    addWord,
    removeWords,
    openaiCall,
    saveNote,
    logout,
} from '../api';
import type { VocabItem, HoverState, NotesModalState } from '../types';

export function useVocabulary(pageSize: number) {
    const [q, setQ] = useState('');
    const [vocab, setVocab] = useState<VocabItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [hover, setHover] = useState<HoverState>({
        show: false,
        x: 0,
        y: 0,
        content: '',
    });
    const [notesModal, setNotesModal] = useState<NotesModalState>({
        show: false,
        word: '',
        note: '',
    });
    const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );

    // Load vocabulary
    const loadVocab = useCallback(async () => {
        try {
            const data = await fetchVocab(q, page, pageSize);
            setVocab(data.items || []);
            setTotalPages(Math.max(1, data.totalPages || 1));
            setSelected(new Set());
        } catch {
            logout();
        }
    }, [q, page, pageSize]);

    // Add word
    const handleAdd = useCallback(async () => {
        if (q.trim()) {
            try {
                await addWord(q.trim());
                setQ('');
                loadVocab();
            } catch (error) {
                console.error('Error adding word:', error);
            }
        }
    }, [q, loadVocab]);

    // Remove selected words
    const handleRemove = useCallback(async () => {
        if (selected.size > 0) {
            try {
                await removeWords(Array.from(selected));
                loadVocab();
            } catch (error) {
                console.error('Error removing words:', error);
            }
        }
    }, [selected, loadVocab]);

    // Toggle word selection
    const toggleSelect = useCallback((word: string) => {
        setSelected((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(word)) {
                newSet.delete(word);
            } else {
                newSet.add(word);
            }
            return newSet;
        });
    }, []);

    // Helper function to calculate hover window position
    const calculateHoverPosition = useCallback((e: React.MouseEvent) => {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            return { x: 0, y: 0 };
        } else {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const hoverWidth = 400;
            const hoverHeight = 300;

            let x = e.pageX;
            let y = e.pageY;

            if (x + hoverWidth > windowWidth) {
                x = windowWidth - hoverWidth - 20;
            }

            if (y + hoverHeight > windowHeight) {
                y = windowHeight - hoverHeight - 20;
            }

            x = Math.max(20, x);
            y = Math.max(20, y);

            return { x, y };
        }
    }, []);

    // Open definition window
    const openDefinition = useCallback(
        async (e: React.MouseEvent, word: string) => {
            e.stopPropagation();

            const { x, y } = calculateHoverPosition(e);

            setHover({
                show: true,
                x,
                y,
                content: 'Loading.',
                isLoading: true,
            });

            let dots = 1;
            loadingIntervalRef.current = setInterval(() => {
                dots = (dots % 3) + 1;
                const loadingText = 'Loading' + '.'.repeat(dots);
                setHover((prev) =>
                    prev.isLoading ? { ...prev, content: loadingText } : prev,
                );
            }, 500);

            try {
                const text = await openaiCall(word, 'define');
                if (loadingIntervalRef.current) {
                    clearInterval(loadingIntervalRef.current);
                    loadingIntervalRef.current = null;
                }
                const { x, y } = calculateHoverPosition(e);
                setHover({
                    show: true,
                    x,
                    y,
                    content: text,
                    isLoading: false,
                });
            } catch {
                if (loadingIntervalRef.current) {
                    clearInterval(loadingIntervalRef.current);
                    loadingIntervalRef.current = null;
                }
                const { x, y } = calculateHoverPosition(e);
                setHover({
                    show: true,
                    x,
                    y,
                    content: 'Error loading definition. Please try again.',
                    isLoading: false,
                });
            }
        },
        [calculateHoverPosition],
    );

    // Close hover window
    const closeHover = useCallback(() => {
        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
        }
        setHover((h) => ({ ...h, show: false }));
    }, []);

    // Handle notes modal
    const handleNotesClick = useCallback((word: string, note: string) => {
        setNotesModal({ show: true, word, note });
    }, []);

    const closeNotesModal = useCallback(() => {
        setNotesModal({ show: false, word: '', note: '' });
    }, []);

    const handleSaveNote = useCallback(async () => {
        try {
            const noteText = notesModal.note.trim();
            if (noteText) {
                await saveNote(notesModal.word, noteText);
            } else {
                await saveNote(notesModal.word, '');
            }
            closeNotesModal();
            loadVocab();
        } catch (error) {
            console.error('Error saving note:', error);
        }
    }, [notesModal.word, notesModal.note, closeNotesModal, loadVocab]);

    // Handle dictionary clicks
    const handleDictionaryClick = useCallback(
        (e: React.MouseEvent, word: string, dictType: 1 | 2) => {
            e.stopPropagation();
            if (dictType === 1) {
                window.open(
                    `https://www.merriam-webster.com/dictionary/${word}`,
                );
            } else {
                window.open(
                    `https://dictionary.cambridge.org/dictionary/english/${word}`,
                );
            }
        },
        [],
    );

    return {
        // State
        q,
        vocab,
        page,
        totalPages,
        selected,
        hover,
        notesModal,

        // Actions
        setQ,
        setPage,
        setNotesModal,
        loadVocab,
        handleAdd,
        handleRemove,
        toggleSelect,
        openDefinition,
        closeHover,
        handleNotesClick,
        closeNotesModal,
        handleSaveNote,
        handleDictionaryClick,
    };
}
