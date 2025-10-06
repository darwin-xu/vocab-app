// Enhanced session management for Cloudflare Workers with D1 database persistence
import { Env } from './types.js';

export interface SessionData {
    token: string;
    user_id: number;
    is_admin: boolean;
    created_at: string;
    last_activity: string;
    expires_at: string;
}

export class SessionManager {
    private env: Env;
    private readonly SESSION_TIMEOUT_HOURS = 24; // 24 hours
    private readonly CLEANUP_INTERVAL_HOURS = 1; // Cleanup expired sessions every hour

    constructor(env: Env) {
        this.env = env;
    }

    /**
     * Create a new session in the database
     */
    async createSession(
        token: string,
        user_id: number,
        is_admin: boolean,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<void> {
        const now = new Date().toISOString();
        const expiresAt = new Date(
            Date.now() + this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000,
        ).toISOString();

        await this.env.DB.prepare(
            `
            INSERT INTO sessions (token, user_id, is_admin, created_at, last_activity, expires_at, user_agent, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
            .bind(
                token,
                user_id,
                is_admin ? 1 : 0,
                now,
                now,
                expiresAt,
                userAgent || null,
                ipAddress || null,
            )
            .run();
    }

    /**
     * Get session data by token
     */
    async getSession(token: string): Promise<SessionData | null> {
        const session = (await this.env.DB.prepare(
            `
            SELECT token, user_id, is_admin, created_at, last_activity, expires_at
            FROM sessions 
            WHERE token = ? AND expires_at > datetime('now')
        `,
        )
            .bind(token)
            .first()) as SessionData | null;

        if (session) {
            // Update last activity AND extend session expiration (sliding window)
            await this.updateSessionActivity(token);
            await this.extendSession(token);
        }

        return session;
    }

    /**
     * Update session last activity timestamp
     */
    async updateSessionActivity(token: string): Promise<void> {
        await this.env.DB.prepare(
            `
            UPDATE sessions 
            SET last_activity = datetime('now') 
            WHERE token = ?
        `,
        )
            .bind(token)
            .run();
    }

    /**
     * Delete a specific session (logout)
     */
    async deleteSession(token: string): Promise<void> {
        await this.env.DB.prepare(
            `
            DELETE FROM sessions WHERE token = ?
        `,
        )
            .bind(token)
            .run();
    }

    /**
     * Delete all sessions for a user
     */
    async deleteAllUserSessions(user_id: number): Promise<void> {
        await this.env.DB.prepare(
            `
            DELETE FROM sessions WHERE user_id = ?
        `,
        )
            .bind(user_id)
            .run();
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await this.env.DB.prepare(
            `
            DELETE FROM sessions WHERE expires_at <= datetime('now')
        `,
        ).run();

        return result.meta?.changes || 0;
    }

    /**
     * Get active session count for a user
     */
    async getUserSessionCount(user_id: number): Promise<number> {
        const result = (await this.env.DB.prepare(
            `
            SELECT COUNT(*) as count 
            FROM sessions 
            WHERE user_id = ? AND expires_at > datetime('now')
        `,
        )
            .bind(user_id)
            .first()) as { count: number } | null;

        return result?.count || 0;
    }

    /**
     * Extend session expiration
     */
    async extendSession(token: string): Promise<boolean> {
        const expiresAt = new Date(
            Date.now() + this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000,
        ).toISOString();

        const result = await this.env.DB.prepare(
            `
            UPDATE sessions 
            SET expires_at = ?, last_activity = datetime('now')
            WHERE token = ? AND expires_at > datetime('now')
        `,
        )
            .bind(expiresAt, token)
            .run();

        return (result.meta?.changes || 0) > 0;
    }

    /**
     * Record logout event for analytics
     */
    async recordLogoutEvent(
        user_id: number | null,
        eventType: string,
        reason: string,
        sessionDurationMs?: number,
        errorDetails?: string,
        apiEndpoint?: string,
        httpStatus?: number,
        userAgent?: string,
    ): Promise<void> {
        try {
            await this.env.DB.prepare(
                `
                INSERT INTO logout_events 
                (user_id, event_type, reason, session_duration_ms, error_details, api_endpoint, http_status, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            )
                .bind(
                    user_id,
                    eventType,
                    reason,
                    sessionDurationMs || null,
                    errorDetails || null,
                    apiEndpoint || null,
                    httpStatus || null,
                    userAgent || null,
                )
                .run();
        } catch (error) {
            console.error('Failed to record logout event:', error);
        }
    }

    /**
     * Get session statistics for debugging
     */
    async getSessionStats(): Promise<{
        activeSessions: number;
        expiredSessions: number;
        totalLogoutEvents: number;
        recentLogouts: Array<{
            event_type: string;
            reason: string;
            created_at: string;
            user_id: number;
        }>;
    }> {
        const [
            activeResult,
            expiredResult,
            logoutCountResult,
            recentLogoutsResult,
        ] = await Promise.all([
            this.env.DB.prepare(
                `
                SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime('now')
            `,
            ).first(),
            this.env.DB.prepare(
                `
                SELECT COUNT(*) as count FROM sessions WHERE expires_at <= datetime('now')
            `,
            ).first(),
            this.env.DB.prepare(
                `
                SELECT COUNT(*) as count FROM logout_events WHERE created_at > datetime('now', '-7 days')
            `,
            ).first(),
            this.env.DB.prepare(
                `
                SELECT event_type, reason, created_at, user_id
                FROM logout_events 
                ORDER BY created_at DESC 
                LIMIT 10
            `,
            ).all(),
        ]);

        return {
            activeSessions: (activeResult as { count: number })?.count || 0,
            expiredSessions: (expiredResult as { count: number })?.count || 0,
            totalLogoutEvents:
                (logoutCountResult as { count: number })?.count || 0,
            recentLogouts: (recentLogoutsResult?.results || []) as Array<{
                event_type: string;
                reason: string;
                created_at: string;
                user_id: number;
            }>,
        };
    }

    /**
     * Initialize session tables if they don't exist
     */
    async initializeTables(): Promise<void> {
        await this.env.DB.prepare(
            `
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                last_activity TEXT NOT NULL DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL,
                user_agent TEXT,
                ip_address TEXT
            )
        `,
        ).run();

        await this.env.DB.prepare(
            `
            CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
        `,
        ).run();

        await this.env.DB.prepare(
            `
            CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
        `,
        ).run();

        await this.env.DB.prepare(
            `
            CREATE TABLE IF NOT EXISTS logout_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                event_type TEXT NOT NULL,
                reason TEXT NOT NULL,
                session_duration_ms INTEGER,
                error_details TEXT,
                api_endpoint TEXT,
                http_status INTEGER,
                user_agent TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `,
        ).run();

        await this.env.DB.prepare(
            `
            CREATE INDEX IF NOT EXISTS idx_logout_events_user_id ON logout_events(user_id)
        `,
        ).run();

        await this.env.DB.prepare(
            `
            CREATE INDEX IF NOT EXISTS idx_logout_events_created_at ON logout_events(created_at)
        `,
        ).run();
    }
}
