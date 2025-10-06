// Enhanced API wrapper with session monitoring
import { sessionAnalytics } from './sessionAnalytics';

interface ApiError extends Error {
    status?: number;
    endpoint?: string;
    isNetworkError?: boolean;
}

export class SessionMonitor {
    private static instance: SessionMonitor;
    private healthCheckInterval: number | null = null;
    private consecutiveFailures = 0;
    private readonly MAX_FAILURES = 3;

    static getInstance(): SessionMonitor {
        if (!SessionMonitor.instance) {
            SessionMonitor.instance = new SessionMonitor();
        }
        return SessionMonitor.instance;
    }

    startHealthCheck() {
        // Perform periodic health checks every 5 minutes
        this.healthCheckInterval = window.setInterval(
            () => {
                this.performHealthCheck();
            },
            5 * 60 * 1000,
        );
    }

    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    private async performHealthCheck() {
        try {
            const token =
                typeof localStorage !== 'undefined'
                    ? localStorage.getItem('sessionToken')
                    : null;
            if (!token) return;

            const response = await fetch('/health', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                sessionAnalytics.recordLogout(
                    'server_error',
                    'Session expired during health check',
                    {
                        httpStatus: 401,
                        apiEndpoint: '/health',
                    },
                );
                this.handleSessionExpired();
            } else if (response.ok) {
                this.consecutiveFailures = 0;
            }
        } catch (error) {
            this.consecutiveFailures++;
            console.warn(
                `Health check failed (${this.consecutiveFailures}/${this.MAX_FAILURES}):`,
                error,
            );

            if (this.consecutiveFailures >= this.MAX_FAILURES) {
                sessionAnalytics.recordLogout(
                    'network_error',
                    'Multiple health check failures',
                    {
                        errorDetails: String(error),
                    },
                );
            }
        }
    }

    private handleSessionExpired() {
        // Clear local storage and redirect to login
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('username');
            localStorage.removeItem('isAdmin');
        }
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }

    async wrapApiCall<T>(
        apiCall: () => Promise<T>,
        endpoint: string,
    ): Promise<T> {
        try {
            const result = await apiCall();
            this.consecutiveFailures = 0;
            return result;
        } catch (error) {
            const apiError = error as ApiError;
            this.handleApiError(apiError, endpoint);
            throw error;
        }
    }

    private handleApiError(error: ApiError, endpoint: string) {
        // Determine error type
        let errorType: 'server_error' | 'network_error' = 'server_error';
        let reason = 'Unknown API error';

        if (error.status === 401) {
            reason = 'Unauthorized - session may have expired';
            sessionAnalytics.recordLogout('server_error', reason, {
                httpStatus: 401,
                apiEndpoint: endpoint,
                errorDetails: error.message,
            });
        } else if (error.status === 403) {
            reason = 'Forbidden - insufficient permissions';
        } else if (error.status && error.status >= 500) {
            reason = 'Server error';
        } else if (
            !error.status ||
            error.message.includes('network') ||
            error.message.includes('fetch')
        ) {
            errorType = 'network_error';
            reason = 'Network connectivity issue';
        }

        // Log the error for analysis
        console.error(`API Error [${endpoint}]:`, {
            status: error.status,
            message: error.message,
            type: errorType,
            reason,
        });

        // Track consecutive failures
        this.consecutiveFailures++;
    }

    getSessionInfo() {
        const token =
            typeof localStorage !== 'undefined'
                ? localStorage.getItem('sessionToken')
                : null;
        const username =
            typeof localStorage !== 'undefined'
                ? localStorage.getItem('username')
                : null;
        const isAdmin =
            typeof localStorage !== 'undefined'
                ? localStorage.getItem('isAdmin')
                : null;

        return {
            hasToken: !!token,
            username,
            isAdmin: isAdmin === 'true',
            consecutiveFailures: this.consecutiveFailures,
            healthCheckActive: !!this.healthCheckInterval,
        };
    }

    // Method to check if we should automatically logout
    shouldAutoLogout(): boolean {
        return this.consecutiveFailures >= this.MAX_FAILURES;
    }

    resetFailureCount() {
        this.consecutiveFailures = 0;
    }
}

export const sessionMonitor = SessionMonitor.getInstance();
