import { useEffect, useState } from 'react';
import { Modal } from '../UI/Modal';
import { getQueryHistory } from '../../api';

interface QueryHistoryItem {
    query_type: string;
    query_time: string;
}

interface HistoryModalProps {
    isOpen: boolean;
    word: string;
    onClose: () => void;
}

export function HistoryModal({ isOpen, word, onClose }: HistoryModalProps) {
    const [history, setHistory] = useState<QueryHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && word) {
            setIsLoading(true);
            setError(null);
            getQueryHistory(word)
                .then((data) => {
                    setHistory(data.history || []);
                    setIsLoading(false);
                })
                .catch((err) => {
                    setError((err as Error).message);
                    setIsLoading(false);
                });
        }
    }, [isOpen, word]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const groupHistoryByType = () => {
        const definitionHistory = history.filter(
            (h) => h.query_type === 'definition',
        );
        const ttsHistory = history.filter((h) => h.query_type === 'tts');

        return { definitionHistory, ttsHistory };
    };

    const { definitionHistory, ttsHistory } = groupHistoryByType();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`History for "${word}"`}
        >
            <div className="space-y-4">
                {isLoading && (
                    <div className="text-center py-4 text-auth-text-medium">
                        Loading history...
                    </div>
                )}

                {error && (
                    <div className="text-center py-4 text-red-600">
                        Error loading history: {error}
                    </div>
                )}

                {!isLoading && !error && history.length === 0 && (
                    <div className="text-center py-4 text-auth-text-medium">
                        No query history for this word yet.
                    </div>
                )}

                {!isLoading && !error && history.length > 0 && (
                    <>
                        {definitionHistory.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-vocab-primary mb-2">
                                    Definition Queries (
                                    {definitionHistory.length})
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {definitionHistory.map((item, index) => (
                                        <div
                                            key={`def-${index}`}
                                            className="text-sm text-auth-text-dark p-2 bg-vocab-surface rounded flex justify-between items-center"
                                        >
                                            <span className="text-xs text-auth-text-medium">
                                                {formatDate(item.query_time)}
                                            </span>
                                            <span className="text-xs bg-vocab-primary text-white px-2 py-1 rounded">
                                                📖 Definition
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ttsHistory.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-vocab-primary mb-2">
                                    Text-to-Speech Queries ({ttsHistory.length})
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {ttsHistory.map((item, index) => (
                                        <div
                                            key={`tts-${index}`}
                                            className="text-sm text-auth-text-dark p-2 bg-vocab-surface rounded flex justify-between items-center"
                                        >
                                            <span className="text-xs text-auth-text-medium">
                                                {formatDate(item.query_time)}
                                            </span>
                                            <span className="text-xs bg-gradient-secondary text-white px-2 py-1 rounded">
                                                🔊 TTS
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-auth-text-medium mt-4 pt-4 border-t border-vocab-border">
                            <p>
                                Total queries: {history.length} (
                                {definitionHistory.length} definitions,{' '}
                                {ttsHistory.length} TTS)
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
