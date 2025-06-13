import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import './app.css';
import './auth.css';
import {
    login,
    register,
    fetchVocab,
    addWord,
    removeWords,
    openaiCall,
    ttsCall,
    logout,
    isAdmin,
    fetchUsers,
    fetchUserDetails,
    updateUserInstructions,
    fetchOwnProfile,
    updateOwnProfile,
} from './api';

// Custom hook to track window size
function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
    });

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        function handleResize() {
            // Debounce resize events to improve performance
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, 150); // 150ms debounce delay
        }

        window.addEventListener('resize', handleResize);
        handleResize(); // Call handler right away so state gets updated with initial window size

        return () => {
            window.removeEventListener('resize', handleResize);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    return windowSize;
}

// Function to calculate dynamic page size based on window height
function calculatePageSize(windowHeight: number): number {
    // Estimate available height for table content
    // Account for header (~120px), input area (~120px), pagination (~80px), margins (~100px)
    const overhead = 420;
    const availableHeight = Math.max(300, windowHeight - overhead);

    // Assume each table row is approximately 50px
    const rowHeight = 50;
    const estimatedRows = Math.floor(availableHeight / rowHeight);

    // Clamp between reasonable bounds
    return Math.max(5, Math.min(50, estimatedRows));
}

// Utility function to format relative time
function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const addedDate = new Date(dateString);
    const diffMs = now.getTime() - addedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'today';
    } else if (diffDays === 1) {
        return '1 day';
    } else if (diffDays < 30) {
        return `${diffDays} days`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? '1 month' : `${months} months`;
    } else {
        const years = Math.floor(diffDays / 365);
        return years === 1 ? '1 year' : `${years} years`;
    }
}

interface VocabItem {
    word: string;
    add_date: string;
}
interface User {
    id: number;
    username: string;
    created_at: string;
}
interface UserDetails {
    id: number;
    username: string;
    custom_instructions: string;
}

function App() {
    const { width: windowWidth, height: windowHeight } = useWindowSize();
    const pageSize = calculatePageSize(windowHeight);

    const [view, setView] = useState<
        'auth' | 'vocab' | 'admin' | 'user-settings'
    >('auth');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authMsg, setAuthMsg] = useState('');
    const [q, setQ] = useState('');
    const [vocab, setVocab] = useState<VocabItem[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [hover, setHover] = useState<{
        show: boolean;
        x: number;
        y: number;
        content: string;
    }>({ show: false, x: 0, y: 0, content: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Admin-related state
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [customInstructions, setCustomInstructions] = useState('');

    // Avatar dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // check login on mount
    useEffect(() => {
        if (localStorage.getItem('sessionToken')) {
            if (isAdmin()) {
                setView('admin');
            } else {
                setView('vocab');
            }
        }
    }, []);

    // Reset to page 1 when page size changes due to window resize
    useEffect(() => {
        if (view === 'vocab' && page > 1) {
            setPage(1);
        }
    }, [pageSize, view]); // eslint-disable-line react-hooks/exhaustive-deps

    // memoized loader
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

    // Load users for admin
    const loadUsers = useCallback(async () => {
        try {
            const data = await fetchUsers();
            setUsers(data.users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }, []);

    // trigger load when view becomes 'vocab'
    useEffect(() => {
        if (view === 'vocab') loadVocab();
        if (view === 'admin') loadUsers();
    }, [view, loadVocab, loadUsers]);

    // Load user details for settings
    async function loadUserDetails(userId: string) {
        try {
            const data = await fetchUserDetails(userId);
            setSelectedUser(data.user);
            setCustomInstructions(data.user.custom_instructions || '');
            setView('user-settings');
        } catch (error) {
            console.error('Error loading user details:', error);
        }
    }

    // Save user instructions
    async function saveUserInstructions() {
        if (!selectedUser) return;
        try {
            // Check if user is editing their own profile
            const currentUserId = localStorage.getItem('userId');
            const isOwnProfile =
                currentUserId && selectedUser.id.toString() === currentUserId;

            if (isOwnProfile) {
                // Use own profile API
                await updateOwnProfile(customInstructions);
            } else {
                // Use admin API for managing other users
                await updateUserInstructions(
                    selectedUser.id.toString(),
                    customInstructions,
                );
            }

            setView(isAdmin() ? 'admin' : 'vocab');
            setSelectedUser(null);
            setCustomInstructions('');
        } catch (error) {
            console.error('Error saving user instructions:', error);
        }
    }

    // Load own profile
    async function loadOwnProfile() {
        try {
            console.log('Loading own profile...');
            const data = await fetchOwnProfile();
            console.log('Own profile data:', data);

            // Store user ID for comparison
            localStorage.setItem('userId', data.user.id.toString());

            // Reuse the existing user-settings view by setting selectedUser to current user's data
            setSelectedUser({
                id: data.user.id,
                username: data.user.username,
                custom_instructions: data.user.custom_instructions || '',
            });
            setCustomInstructions(data.user.custom_instructions || '');
            setView('user-settings');
        } catch (error) {
            console.error('Error loading own profile:', error);
        }
    }

    // Get user initials for avatar
    function getUserInitials() {
        const name = localStorage.getItem('username') || 'User';
        return name.substring(0, 2).toUpperCase();
    }

    // Handle click outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    async function handleAuth(isRegister = false) {
        setIsLoading(true);
        try {
            if (isRegister) await register(username, password);
            else await login(username, password);

            // Store username in localStorage (already done in login function)
            // We'll get the user ID when needed from the profile API

            // Redirect based on admin status
            if (isAdmin()) {
                setView('admin');
            } else {
                setView('vocab');
            }
            setAuthMsg('');
        } catch (e) {
            setAuthMsg((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && username && password && !isLoading) {
            handleAuth(false); // Default to login on Enter
        }
    }

    async function handleAdd() {
        if (q.trim()) {
            try {
                await addWord(q.trim());
                setQ('');
                loadVocab();
            } catch (error) {
                console.error('Error adding word:', error);
            }
        }
    }

    async function handleRemove() {
        if (selected.size > 0) {
            try {
                await removeWords(Array.from(selected));
                loadVocab();
            } catch (error) {
                console.error('Error removing words:', error);
            }
        }
    }

    function toggleSelect(word: string) {
        const s = new Set(selected);
        if (s.has(word)) s.delete(word);
        else s.add(word);
        setSelected(s);
    }

    async function openDefinition(e: React.MouseEvent, word: string) {
        e.stopPropagation();
        const text = await openaiCall(word, 'define');
        setHover({ show: true, x: e.pageX, y: e.pageY, content: text });
    }

    function closeHover() {
        setHover((h) => ({ ...h, show: false }));
    }

    // Smart pagination function that determines which page numbers to show
    function getVisiblePageNumbers() {
        const maxVisiblePages =
            windowWidth < 768 ? 5 : windowWidth < 1024 ? 7 : 9;

        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const halfVisible = Math.floor(maxVisiblePages / 2);
        let start = Math.max(1, page - halfVisible);
        const end = Math.min(totalPages, start + maxVisiblePages - 1);

        // Adjust start if we're near the end
        if (end - start < maxVisiblePages - 1) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    return view === 'auth' ? (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <div className="logo">
                        <div className="logo-icon">📚</div>
                        <h1>Vocabulary Builder</h1>
                    </div>
                    <p className="auth-subtitle">
                        Build your vocabulary, one word at a time
                    </p>
                </div>

                <div className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="auth-buttons">
                        <button
                            className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                            onClick={() => handleAuth(false)}
                            disabled={!username || !password || isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button
                            className={`btn btn-secondary ${isLoading ? 'loading' : ''}`}
                            onClick={() => handleAuth(true)}
                            disabled={!username || !password || isLoading}
                        >
                            {isLoading
                                ? 'Creating Account...'
                                : 'Create Account'}
                        </button>
                    </div>

                    <div
                        className={`auth-message ${authMsg ? (authMsg.includes('already exists') || authMsg.includes('Invalid') ? 'error' : 'success') : 'hidden'}`}
                    >
                        {authMsg || '\u00A0'}
                    </div>
                </div>
            </div>
        </div>
    ) : view === 'admin' ? (
        // Admin user management interface
        <div
            onClick={() => {
                closeHover();
            }}
        >
            <div className="user-avatar" ref={dropdownRef}>
                <div
                    className={`avatar-button ${dropdownOpen ? 'open' : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    {getUserInitials()}
                </div>
                <div className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                        {localStorage.getItem('username')} (Admin)
                    </div>
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            console.log('Admin Settings clicked!');
                            loadOwnProfile();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="icon">⚙️</span>
                        Settings
                    </button>
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            console.log('Admin Logout clicked!');
                            logout();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="icon">🚪</span>
                        Logout
                    </button>
                </div>
            </div>
            <div className="container">
                <h1>User Management</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <span className="montserrat-unique">
                                        {user.username}
                                    </span>
                                </td>
                                <td>{formatRelativeTime(user.created_at)}</td>
                                <td>
                                    <button
                                        className="settings-btn"
                                        onClick={() =>
                                            loadUserDetails(user.id.toString())
                                        }
                                        title="User Settings"
                                    >
                                        Settings
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    ) : view === 'user-settings' ? (
        // User settings page (works for both admin managing others and users managing themselves)
        <div className="auth-page">
            <div className="auth-container user-settings-container">
                <div className="auth-header">
                    <h1>
                        {selectedUser?.id.toString() ===
                        localStorage.getItem('userId')
                            ? 'My Settings'
                            : 'User Settings'}
                    </h1>
                    <p className="auth-subtitle">
                        {selectedUser?.id.toString() ===
                        localStorage.getItem('userId')
                            ? 'Configure your custom word definition instructions'
                            : `Configure custom instructions for ${selectedUser?.username}`}
                    </p>
                </div>
                <div className="auth-form">
                    <div className="form-group">
                        <label htmlFor="instructions">
                            Custom Word Definition Instructions
                        </label>
                        <textarea
                            id="instructions"
                            placeholder="Enter custom instructions for how words should be defined for this user. Use {word} as placeholder for the word to be defined.

Example:
Define the word '{word}' in a simple way:
**Meaning:** [simple definition]
**Example:** [example sentence]"
                            value={customInstructions}
                            onChange={(e) =>
                                setCustomInstructions(e.target.value)
                            }
                            rows={10}
                            style={{
                                width: '100%',
                                padding: '1.25rem',
                                border: '2px solid #e5e7eb',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: 'var(--font-sm)',
                                fontFamily:
                                    'Monaco, Menlo, Ubuntu Mono, monospace',
                                resize: 'vertical',
                                minHeight: '250px',
                            }}
                        />
                    </div>
                    <div className="auth-buttons">
                        <button
                            className="btn btn-primary"
                            onClick={saveUserInstructions}
                        >
                            Save Instructions
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() =>
                                setView(isAdmin() ? 'admin' : 'vocab')
                            }
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        // Regular vocabulary interface
        <div
            onClick={() => {
                closeHover();
            }}
        >
            <div className="user-avatar" ref={dropdownRef}>
                <div
                    className={`avatar-button ${dropdownOpen ? 'open' : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    {getUserInitials()}
                </div>
                <div className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                        {localStorage.getItem('username')}
                    </div>
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            console.log('User Settings clicked!');
                            loadOwnProfile();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="icon">⚙️</span>
                        Settings
                    </button>
                    {isAdmin() && (
                        <button
                            className="dropdown-item"
                            onClick={() => {
                                console.log('Admin Panel clicked!');
                                setView('admin');
                                setDropdownOpen(false);
                            }}
                        >
                            <span className="icon">👤</span>
                            Admin Panel
                        </button>
                    )}
                    <button
                        className="dropdown-item"
                        onClick={() => {
                            console.log('User Logout clicked!');
                            logout();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="icon">🚪</span>
                        Logout
                    </button>
                </div>
            </div>
            <div className="container">
                <h1>Vocabulary Builder</h1>
                <div className="field-row">
                    <input
                        id="word"
                        placeholder="Word (type to search)…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <button
                        id="addBtn"
                        className={selected.size > 0 ? 'remove-mode' : ''}
                        onClick={selected.size > 0 ? handleRemove : handleAdd}
                        disabled={selected.size > 0 ? false : !q.trim()}
                    >
                        {selected.size > 0
                            ? `Remove (${selected.size})`
                            : 'Add Word'}
                    </button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Word</th>
                            <th></th>
                            <th></th>
                            <th>Added</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(vocab || []).map((r) => (
                            <tr key={r.word}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r.word)}
                                        onChange={() => toggleSelect(r.word)}
                                    />
                                </td>
                                <td>
                                    <span
                                        className="montserrat-unique"
                                        onClick={(e) => openDefinition(e, r.word)}
                                    >
                                        {r.word}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="dict-btn"
                                        onClick={() =>
                                            window.open(
                                                `https://dictionary.cambridge.org/dictionary/english/${r.word}`,
                                            )
                                        }
                                    >
                                        <img
                                            src="https://dictionary.cambridge.org/favicon.ico"
                                            alt="Cambridge"
                                        />
                                    </button>
                                </td>
                                <td>
                                    <button
                                        className="mw-btn"
                                        onClick={() =>
                                            window.open(
                                                `https://www.merriam-webster.com/dictionary/${r.word}`,
                                            )
                                        }
                                    >
                                        <img
                                            src="https://www.merriam-webster.com/favicon.ico"
                                            alt="MW"
                                        />
                                    </button>
                                </td>
                                <td>{formatRelativeTime(r.add_date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div id="pagination">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                >
                    &lt;
                </button>
                {getVisiblePageNumbers().map((pageNum) => (
                    <span
                        key={pageNum}
                        className={page === pageNum ? 'active' : ''}
                        onClick={() => setPage(pageNum)}
                    >
                        {pageNum}
                    </span>
                ))}
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    &gt;
                </button>
            </div>
            {hover.show && (
                <div
                    id="hover-window"
                    className="show"
                    style={{ left: hover.x, top: hover.y }}
                    onClick={() => {
                        ttsCall(hover.content).then((b64) =>
                            new Audio(`data:audio/wav;base64,${b64}`).play(),
                        );
                        closeHover();
                    }}
                    dangerouslySetInnerHTML={{ __html: marked(hover.content) }}
                />
            )}
        </div>
    );
}

export default App;
