import { useState, useCallback, useRef, useEffect } from 'react';
import {
    fetchVocab,
    addWord,
    removeWords,
    openaiCall,
    saveNote,
    logout,
} from '../api';
import { sessionMonitor } from '../utils/sessionMonitor';
import { sessionAnalytics } from '../utils/sessionAnalytics';
import type { VocabItem, HoverState, NotesModalState } from '../types';

export function useVocabulary(pageSize: number, shouldLoad: boolean = false) {
    const [q, setQ] = useState('');
    const [vocab, setVocab] = useState<VocabItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [refreshCounter, setRefreshCounter] = useState(0);
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
            setVocab(data?.items || []);
            setTotalPages(Math.max(1, data?.totalPages || 1));
            setSelected(new Set());
        } catch (error) {
            console.error('Error in loadVocab:', error);
            
            // Check if this is a session-related error before auto-logout
            const errorMessage = (error as Error).message.toLowerCase();
            if (errorMessage.includes('unauthorized') || errorMessage.includes('session')) {
                // Only logout if we've had multiple failures or this is clearly a session issue
                if (sessionMonitor.shouldAutoLogout()) {
                    sessionAnalytics.recordLogout('auto', 'Multiple API failures in loadVocab', {
                        errorDetails: (error as Error).message,
                        apiEndpoint: '/vocab'
                    });
                    logout();
                } else {
                    console.warn('API error detected, but not forcing logout yet:', error);
                }
            } else {
                // For non-session errors, just log but don't logout
                console.warn('Non-session related error in loadVocab:', error);
            }
        }
    }, [q, page, pageSize]);

    // Auto-load vocabulary when dependencies change
    useEffect(() => {
        if (shouldLoad) {
            loadVocab();
        }
    }, [shouldLoad, q, page, pageSize, refreshCounter, loadVocab]);

    // Add word
    const handleAdd = useCallback(async () => {
        if (q.trim()) {
            try {
                await addWord(q.trim());
                setQ('');
                // Reset to page 1 and trigger reload
                setPage(1);
            } catch (error) {
                console.error('Error adding word:', error);
            }
        }
    }, [q]);

    // Remove selected words
    const handleRemove = useCallback(async () => {
        if (selected.size > 0) {
            try {
                await removeWords(Array.from(selected));
                // Trigger reload by incrementing refresh counter
                setRefreshCounter(prev => prev + 1);
            } catch (error) {
                console.error('Error removing words:', error);
            }
        }
    }, [selected]);

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
            // On mobile, align hover window top with the clicked word
            return { x: 0, y: e.pageY };
        } else {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const hoverWidth = 400;

            let x = e.pageX;
            let y = e.pageY;

            // Ensure hover window doesn't go off screen horizontally
            if (x + hoverWidth > windowWidth) {
                x = windowWidth - hoverWidth - 20;
            }

            // For vertical positioning, try to keep it visible but don't constrain height
            // If the click is in the bottom 40% of screen, position above the cursor
            if (y > windowHeight * 0.6) {
                y = Math.max(20, y - 100); // Position 100px above cursor
            }

            // Keep some padding from edges
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
                word,
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
                    word,
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
                    word,
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
            setRefreshCounter(prev => prev + 1);
        } catch (error) {
            console.error('Error saving note:', error);
        }
    }, [notesModal.word, notesModal.note, closeNotesModal]);

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

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

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
        setPage: handlePageChange,
        setNotesModal,
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
