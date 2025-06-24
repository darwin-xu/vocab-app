import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../src/sessionManager';
import { Env } from '../src/types';

// Mock D1 database
const mockDB = {
    prepare: vi.fn(),
};

const mockEnv: Env = {
    DB: mockDB as unknown as D1Database,
    ASSETS: { fetch: vi.fn() },
    OPENAI_TOKEN: 'test-token',
    ENVIRONMENT: 'test',
};

describe('Session Sliding Window', () => {
    let sessionManager: SessionManager;
    
    beforeEach(() => {
        vi.clearAllMocks();
        sessionManager = new SessionManager(mockEnv);
    });

    it('should extend session expiration on getSession call', async () => {
        const mockToken = 'test-token-123';
        const mockSession = {
            token: mockToken,
            user_id: 1,
            is_admin: 0,
            created_at: '2025-06-24T10:00:00.000Z',
            last_activity: '2025-06-24T14:00:00.000Z',
            expires_at: '2025-06-25T10:00:00.000Z',
        };

        // Mock the SELECT query to return a session
        const mockFirst = vi.fn().mockResolvedValue(mockSession);
        const mockSelectQuery = {
            bind: vi.fn().mockReturnThis(),
            first: mockFirst,
        };

        // Mock the UPDATE queries (for updateSessionActivity and extendSession)
        const mockUpdateResult = { meta: { changes: 1 } };
        const mockRun = vi.fn().mockResolvedValue(mockUpdateResult);
        const mockUpdateQuery = {
            bind: vi.fn().mockReturnThis(),
            run: mockRun,
        };

        // Set up the prepare mock to return appropriate queries
        mockDB.prepare
            .mockReturnValueOnce(mockSelectQuery) // First call: SELECT session
            .mockReturnValueOnce(mockUpdateQuery) // Second call: UPDATE last_activity
            .mockReturnValueOnce(mockUpdateQuery); // Third call: UPDATE expires_at (extend session)

        // Call getSession
        const result = await sessionManager.getSession(mockToken);

        // Verify the session was returned
        expect(result).toEqual(mockSession);

        // Verify all queries were called correctly
        expect(mockDB.prepare).toHaveBeenCalledTimes(3);
        
        // Verify SELECT query
        expect(mockDB.prepare).toHaveBeenNthCalledWith(1, 
            expect.stringContaining('SELECT token, user_id, is_admin, created_at, last_activity, expires_at')
        );
        expect(mockSelectQuery.bind).toHaveBeenCalledWith(mockToken);
        
        // Verify UPDATE last_activity query
        expect(mockDB.prepare).toHaveBeenNthCalledWith(2,
            expect.stringContaining('UPDATE sessions')
        );
        expect(mockDB.prepare).toHaveBeenNthCalledWith(2,
            expect.stringContaining('SET last_activity = datetime(\'now\')')
        );
        expect(mockUpdateQuery.bind).toHaveBeenNthCalledWith(1, mockToken);
        
        // Verify UPDATE expires_at query (session extension)
        expect(mockDB.prepare).toHaveBeenNthCalledWith(3,
            expect.stringContaining('UPDATE sessions')
        );
        expect(mockDB.prepare).toHaveBeenNthCalledWith(3,
            expect.stringContaining('SET expires_at = ?')
        );
        expect(mockUpdateQuery.bind).toHaveBeenNthCalledWith(2, expect.any(String), mockToken);
    });

    it('should not extend session if session not found', async () => {
        const mockToken = 'invalid-token';

        // Mock the SELECT query to return null (no session found)
        const mockFirst = vi.fn().mockResolvedValue(null);
        const mockSelectQuery = {
            bind: vi.fn().mockReturnThis(),
            first: mockFirst,
        };

        mockDB.prepare.mockReturnValueOnce(mockSelectQuery);

        // Call getSession
        const result = await sessionManager.getSession(mockToken);

        // Verify no session was returned
        expect(result).toBeNull();

        // Verify only the SELECT query was called (no UPDATE queries)
        expect(mockDB.prepare).toHaveBeenCalledTimes(1);
        expect(mockDB.prepare).toHaveBeenCalledWith(
            expect.stringContaining('SELECT token, user_id, is_admin, created_at, last_activity, expires_at')
        );
    });

    it('should calculate correct expiration time when extending session', async () => {
        const mockToken = 'test-token-123';
        
        // Mock current time
        const mockNow = new Date('2025-06-24T15:00:00.000Z');
        vi.setSystemTime(mockNow);

        // Expected expiration: 24 hours from now
        const expectedExpiration = new Date(mockNow.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const mockUpdateResult = { meta: { changes: 1 } };
        const mockRun = vi.fn().mockResolvedValue(mockUpdateResult);
        const mockUpdateQuery = {
            bind: vi.fn().mockReturnThis(),
            run: mockRun,
        };

        mockDB.prepare.mockReturnValue(mockUpdateQuery);

        // Call extendSession directly to test the calculation
        const result = await sessionManager.extendSession(mockToken);

        // Verify session was extended
        expect(result).toBe(true);

        // Verify the expiration time calculation
        expect(mockUpdateQuery.bind).toHaveBeenCalledWith(expectedExpiration, mockToken);

        // Clean up
        vi.useRealTimers();
    });
});
