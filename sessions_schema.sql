-- Add sessions table for persistent session storage
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_activity TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Add logout analytics table (optional, for detailed analysis)
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
);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_logout_events_user_id ON logout_events(user_id);
CREATE INDEX IF NOT EXISTS idx_logout_events_created_at ON logout_events(created_at);
CREATE INDEX IF NOT EXISTS idx_logout_events_type ON logout_events(event_type);
