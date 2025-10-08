// Session Debug and Analytics System
// This file helps track logout events and session issues

import { warnLog, debugLog } from './logger';

export interface LogoutEvent {
    timestamp: string;
    type: 'manual' | 'auto' | 'server_error' | 'network_error';
    reason: string;
    userAgent: string;
    sessionDuration: number; // in milliseconds
    lastActivity: string;
    errorDetails?: string;
    apiEndpoint?: string;
    httpStatus?: number;
}

class SessionAnalytics {
    private static readonly STORAGE_KEY = 'session_analytics';
    private static readonly MAX_EVENTS = 50;
    private loginTime: number | null = null;
    private lastActivity: number = Date.now();

    constructor() {
        this.updateActivity();
        this.setupActivityTracking();
    }

    private setupActivityTracking() {
        // Only setup activity tracking in browser environment
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            return;
        }

        // Track user activity
        const events = ['click', 'keypress', 'scroll', 'mousemove'];
        events.forEach((event) => {
            document.addEventListener(
                event,
                () => {
                    this.updateActivity();
                },
                { passive: true },
            );
        });

        // Track page visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateActivity();
            }
        });
    }

    private updateActivity() {
        this.lastActivity = Date.now();
    }

    setLoginTime(time: number = Date.now()) {
        this.loginTime = time;
        this.updateActivity();
    }

    private getSessionDuration(): number {
        return this.loginTime ? Date.now() - this.loginTime : 0;
    }

    private getStoredEvents(): LogoutEvent[] {
        try {
            if (typeof localStorage === 'undefined') return [];
            const stored = localStorage.getItem(SessionAnalytics.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private storeEvent(event: LogoutEvent) {
        try {
            if (typeof localStorage === 'undefined') return;
            const events = this.getStoredEvents();
            events.unshift(event);

            // Keep only the most recent events
            if (events.length > SessionAnalytics.MAX_EVENTS) {
                events.splice(SessionAnalytics.MAX_EVENTS);
            }

            localStorage.setItem(
                SessionAnalytics.STORAGE_KEY,
                JSON.stringify(events),
            );
        } catch (error) {
            warnLog('Failed to store logout event:', error);
        }
    }

    recordLogout(
        type: LogoutEvent['type'],
        reason: string,
        details?: {
            errorDetails?: string;
            apiEndpoint?: string;
            httpStatus?: number;
        },
    ) {
        const event: LogoutEvent = {
            timestamp: new Date().toISOString(),
            type,
            reason,
            userAgent: navigator.userAgent,
            sessionDuration: this.getSessionDuration(),
            lastActivity: new Date(this.lastActivity).toISOString(),
            ...details,
        };

        this.storeEvent(event);
        warnLog('Logout recorded:', event);

        // Send to server for analysis (optional)
        this.sendLogoutEvent(event);
    }

    private async sendLogoutEvent(event: LogoutEvent) {
        try {
            // Only send if we have a token (meaning we were logged in)
            const token =
                typeof localStorage !== 'undefined'
                    ? localStorage.getItem('sessionToken')
                    : null;
            if (!token) return;

            await fetch('/analytics/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(event),
            });
        } catch (error) {
            // Silently fail - analytics shouldn't break the app
            debugLog('Failed to send logout analytics:', error);
        }
    }

    getLogoutHistory(): LogoutEvent[] {
        return this.getStoredEvents();
    }

    getSessionHealth(): {
        totalLogouts: number;
        unexpectedLogouts: number;
        averageSessionDuration: number;
        commonReasons: Array<{ reason: string; count: number }>;
        recentPatterns: string[];
    } {
        const events = this.getStoredEvents();
        const unexpectedEvents = events.filter((e) => e.type !== 'manual');

        const reasonCounts = new Map<string, number>();
        events.forEach((event) => {
            const count = reasonCounts.get(event.reason) || 0;
            reasonCounts.set(event.reason, count + 1);
        });

        const commonReasons = Array.from(reasonCounts.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);

        const avgDuration =
            events.length > 0
                ? events.reduce((sum, e) => sum + e.sessionDuration, 0) /
                  events.length
                : 0;

        // Identify patterns in recent events
        const recentEvents = events.slice(0, 10);
        const patterns: string[] = [];

        if (recentEvents.filter((e) => e.httpStatus === 401).length > 2) {
            patterns.push('Frequent 401 Unauthorized responses');
        }

        if (
            recentEvents.filter((e) => e.reason.includes('network')).length > 2
        ) {
            patterns.push('Network connectivity issues');
        }

        if (recentEvents.filter((e) => e.sessionDuration < 60000).length > 3) {
            patterns.push('Very short sessions (< 1 minute)');
        }

        return {
            totalLogouts: events.length,
            unexpectedLogouts: unexpectedEvents.length,
            averageSessionDuration: avgDuration,
            commonReasons,
            recentPatterns: patterns,
        };
    }

    clearHistory() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(SessionAnalytics.STORAGE_KEY);
        }
    }
}

export const sessionAnalytics = new SessionAnalytics();
