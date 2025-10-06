import { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { sessionAnalytics } from '../../utils/sessionAnalytics';
import { sessionMonitor } from '../../utils/sessionMonitor';
import type { LogoutEvent } from '../../utils/sessionAnalytics';

interface SessionDebugProps {
    onClose: () => void;
}

interface SessionHealth {
    totalLogouts: number;
    unexpectedLogouts: number;
    averageSessionDuration: number;
    commonReasons: Array<{ reason: string; count: number }>;
    recentPatterns: string[];
}

interface SessionInfo {
    hasToken: boolean;
    username: string | null;
    isAdmin: boolean;
    consecutiveFailures: number;
    healthCheckActive: boolean;
}

export function SessionDebugPanel({ onClose }: SessionDebugProps) {
    const [logoutHistory, setLogoutHistory] = useState<LogoutEvent[]>([]);
    const [sessionHealth, setSessionHealth] = useState<SessionHealth | null>(
        null,
    );
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

    useEffect(() => {
        setLogoutHistory(sessionAnalytics.getLogoutHistory());
        setSessionHealth(sessionAnalytics.getSessionHealth());
        setSessionInfo(sessionMonitor.getSessionInfo());
    }, []);

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    };

    const getEventTypeColor = (type: LogoutEvent['type']) => {
        switch (type) {
            case 'manual':
                return 'text-green-600 bg-green-50';
            case 'auto':
                return 'text-yellow-600 bg-yellow-50';
            case 'server_error':
                return 'text-red-600 bg-red-50';
            case 'network_error':
                return 'text-orange-600 bg-orange-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const clearHistory = () => {
        sessionAnalytics.clearHistory();
        setLogoutHistory([]);
        setSessionHealth(sessionAnalytics.getSessionHealth());
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Session Debug Panel
                        </h2>
                        <Button onClick={onClose}>Close</Button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Current Session Info */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">
                            Current Session
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="font-medium">Status:</span>{' '}
                                    <span
                                        className={
                                            sessionInfo?.hasToken
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }
                                    >
                                        {sessionInfo?.hasToken
                                            ? 'Authenticated'
                                            : 'Not Authenticated'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Username:
                                    </span>{' '}
                                    {sessionInfo?.username || 'N/A'}
                                </div>
                                <div>
                                    <span className="font-medium">Admin:</span>{' '}
                                    {sessionInfo?.isAdmin ? 'Yes' : 'No'}
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Health Check:
                                    </span>{' '}
                                    <span
                                        className={
                                            sessionInfo?.healthCheckActive
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }
                                    >
                                        {sessionInfo?.healthCheckActive
                                            ? 'Active'
                                            : 'Inactive'}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        Consecutive Failures:
                                    </span>{' '}
                                    <span
                                        className={
                                            (sessionInfo?.consecutiveFailures ??
                                                0) > 2
                                                ? 'text-red-600'
                                                : 'text-gray-600'
                                        }
                                    >
                                        {sessionInfo?.consecutiveFailures ?? 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Session Health Overview */}
                    {sessionHealth && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4">
                                Session Health Overview
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {sessionHealth.totalLogouts}
                                    </div>
                                    <div className="text-sm text-blue-600">
                                        Total Logouts
                                    </div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">
                                        {sessionHealth.unexpectedLogouts}
                                    </div>
                                    <div className="text-sm text-red-600">
                                        Unexpected
                                    </div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatDuration(
                                            sessionHealth.averageSessionDuration,
                                        )}
                                    </div>
                                    <div className="text-sm text-green-600">
                                        Avg Session
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {sessionHealth.recentPatterns.length}
                                    </div>
                                    <div className="text-sm text-yellow-600">
                                        Issues Found
                                    </div>
                                </div>
                            </div>

                            {sessionHealth.recentPatterns.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2">
                                        Recent Patterns Detected:
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {sessionHealth.recentPatterns.map(
                                            (
                                                pattern: string,
                                                index: number,
                                            ) => (
                                                <li
                                                    key={index}
                                                    className="text-yellow-700 bg-yellow-50 p-2 rounded"
                                                >
                                                    {pattern}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}

                            {sessionHealth.commonReasons.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2">
                                        Common Logout Reasons:
                                    </h4>
                                    <div className="space-y-2">
                                        {sessionHealth.commonReasons
                                            .slice(0, 5)
                                            .map(
                                                (
                                                    item: {
                                                        reason: string;
                                                        count: number;
                                                    },
                                                    index: number,
                                                ) => (
                                                    <div
                                                        key={index}
                                                        className="flex justify-between items-center bg-gray-50 p-2 rounded"
                                                    >
                                                        <span className="text-sm">
                                                            {item.reason}
                                                        </span>
                                                        <span className="text-sm font-medium">
                                                            {item.count}x
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Logout History */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                Logout History
                            </h3>
                            <Button
                                onClick={clearHistory}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                Clear History
                            </Button>
                        </div>

                        {logoutHistory.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                No logout events recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {logoutHistory.map((event, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-4"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}
                                                >
                                                    {event.type
                                                        .replace('_', ' ')
                                                        .toUpperCase()}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {new Date(
                                                        event.timestamp,
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                Session:{' '}
                                                {formatDuration(
                                                    event.sessionDuration,
                                                )}
                                            </span>
                                        </div>
                                        <div className="text-sm mb-2">
                                            <strong>Reason:</strong>{' '}
                                            {event.reason}
                                        </div>
                                        {event.errorDetails && (
                                            <div className="text-sm text-red-600 mb-2">
                                                <strong>Error:</strong>{' '}
                                                {event.errorDetails}
                                            </div>
                                        )}
                                        {event.apiEndpoint && (
                                            <div className="text-sm text-gray-600 mb-2">
                                                <strong>Endpoint:</strong>{' '}
                                                {event.apiEndpoint}
                                                {event.httpStatus && (
                                                    <span className="ml-2 text-gray-500">
                                                        (HTTP {event.httpStatus}
                                                        )
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            Last Activity:{' '}
                                            {new Date(
                                                event.lastActivity,
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
