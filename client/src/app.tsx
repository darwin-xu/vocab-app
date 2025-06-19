import React, { useState, useEffect, useCallback, useRef } from 'react';
import './components.css';
import {
    login,
    register,
    fetchVocab,
    addWord,
    removeWords,
    openaiCall,
    logout,
    isAdmin,
    fetchUsers,
    saveNote,
    fetchUserDetails,
    updateUserInstructions,
    fetchOwnProfile,
    updateOwnProfile,
} from './api';
import TTSControls from './components/TTSControls';

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

    // Clamp between reasonable bounds and double the size
    const baseSize = Math.max(5, Math.min(50, estimatedRows));
    return baseSize * 2;
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
    note?: string;
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
        isLoading?: boolean;
    }>({ show: false, x: 0, y: 0, content: '' });
    const [isLoading, setIsLoading] = useState(false);
    const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Admin-related state
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);

    // Notes modal state
    const [notesModal, setNotesModal] = useState<{
        show: boolean;
        word: string;
        note: string;
    }>({ show: false, word: '', note: '' });

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

    // Cleanup loading interval on unmount
    useEffect(() => {
        return () => {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
        };
    }, []);

    // Load user details for settings
    async function loadUserDetails(userId: string) {
        try {
            const data = await fetchUserDetails(userId);
            setSelectedUser(data.user);
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
                await updateOwnProfile(selectedUser.custom_instructions);
            } else {
                // Use admin API for managing other users
                await updateUserInstructions(
                    selectedUser.id.toString(),
                    selectedUser.custom_instructions,
                );
            }

            setView(isAdmin() ? 'admin' : 'vocab');
            setSelectedUser(null);
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

            // Navigate to user settings view
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

    function closeNotesModal() {
        setNotesModal({ show: false, word: '', note: '' });
    }

    async function handleSaveNote() {
        try {
            const noteText = notesModal.note.trim();
            if (noteText) {
                // Save the note
                await saveNote(notesModal.word, noteText);
            } else {
                // Clear the note by saving an empty string (this will delete it on backend)
                await saveNote(notesModal.word, '');
            }
            closeNotesModal();
            loadVocab(); // Reload to get updated notes
        } catch (error) {
            console.error('Error saving note:', error);
        }
    }

    // Helper function to calculate hover window position
    function calculateHoverPosition(e: React.MouseEvent) {
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // On mobile, position will be handled by CSS (centered)
            return { x: 0, y: 0 };
        } else {
            // On desktop, use mouse position with adjustments to keep window on screen
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const hoverWidth = 400; // min-width from CSS
            const hoverHeight = 300; // estimated height

            let x = e.pageX;
            let y = e.pageY;

            // Adjust if window would go off right edge
            if (x + hoverWidth > windowWidth) {
                x = windowWidth - hoverWidth - 20;
            }

            // Adjust if window would go off bottom edge
            if (y + hoverHeight > windowHeight) {
                y = windowHeight - hoverHeight - 20;
            }

            // Ensure minimum margins
            x = Math.max(20, x);
            y = Math.max(20, y);

            return { x, y };
        }
    }

    async function openDefinition(e: React.MouseEvent, word: string) {
        e.stopPropagation();

        // Calculate position based on device type
        const { x, y } = calculateHoverPosition(e);

        // Show loading window immediately
        setHover({
            show: true,
            x,
            y,
            content: 'Loading.',
            isLoading: true,
        });

        // Start loading animation
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
            // Clear loading interval and show result
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
            // Clear loading interval and show error
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
    }

    function closeHover() {
        // Clear loading interval if it's running
        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
        }
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
        <div className="min-h-screen box-border p-8 overflow-hidden flex items-center justify-center bg-gradient-auth relative">
            {/* Animated background pattern */}
            <div 
                className="fixed inset-0 opacity-10 animate-float -z-10 pointer-events-none"
                style={{
                    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`
                }}
            />
            
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-12 max-w-md w-full shadow-xl border border-white/20 relative animate-slideIn">
                <div className="text-center mb-10">
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="text-5xl bg-gradient-primary bg-clip-text text-transparent">
                            📚
                        </div>
                        <h1 className="m-0 text-4xl font-bold bg-gradient-text bg-clip-text text-transparent tracking-tight">
                            Vocabulary Builder
                        </h1>
                    </div>
                    <p className="m-0 text-auth-text-medium text-base font-normal leading-relaxed">
                        Build your vocabulary, one word at a time
                    </p>
                </div>

                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-3.5">
                        <label htmlFor="username" className="text-sm font-semibold text-auth-text-dark ml-0.5">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoComplete="username"
                            className="px-7 py-5 border-2 border-gray-200 rounded-lg text-lg transition-all duration-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-auth-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light"
                        />
                    </div>

                    <div className="flex flex-col gap-3.5">
                        <label htmlFor="password" className="text-sm font-semibold text-auth-text-dark ml-0.5">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            autoComplete="current-password"
                            className="px-7 py-5 border-2 border-gray-200 rounded-lg text-lg transition-all duration-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-auth-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light"
                        />
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <button
                            className={`px-9 py-5 border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 relative overflow-hidden bg-gradient-primary text-white shadow-vocab-lg ${!username || !password || isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] active:translate-y-0'} ${isLoading ? 'before:content-[""] before:inline-block before:w-3.5 before:h-3.5 before:border-2 before:border-transparent before:border-t-current before:rounded-full before:animate-spin before:mr-2 before:opacity-80' : ''}`}
                            onClick={() => handleAuth(false)}
                            disabled={!username || !password || isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button
                            className={`px-9 py-5 border-2 border-slate-200 rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 bg-slate-50 text-slate-600 shadow-sm ${!username || !password || isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'} ${isLoading ? 'before:content-[""] before:inline-block before:w-3.5 before:h-3.5 before:border-2 before:border-transparent before:border-t-current before:rounded-full before:animate-spin before:mr-2 before:opacity-80' : ''}`}
                            onClick={() => handleAuth(true)}
                            disabled={!username || !password || isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>

                    <div
                        className={`px-4 py-3 rounded-sm text-sm font-medium text-center mt-2 min-h-10 flex items-center justify-center animate-slideDown ${authMsg ? (authMsg.includes('already exists') || authMsg.includes('Invalid') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200') : 'opacity-0 bg-transparent border border-transparent'}`}
                    >
                        {authMsg || '\u00A0'}
                    </div>
                </div>
            </div>
        </div>
    ) : view === 'admin' ? (
        // Admin user management interface
        <div
            className="min-h-screen font-inter text-auth-text-dark leading-relaxed relative bg-gradient-primary"
            onClick={() => {
                closeHover();
            }}
        >
            {/* Animated background pattern */}
            <div 
                className="fixed inset-0 opacity-10 animate-float -z-10 pointer-events-none"
                style={{
                    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`
                }}
            />
            {/* Admin User Avatar and Dropdown */}
            <div className="fixed top-lg right-xl z-[2000] font-inter" ref={dropdownRef}>
                <div
                    className={`w-12 h-12 rounded-full bg-gradient-primary border-3 border-white/20 cursor-pointer flex items-center justify-center text-lg font-semibold text-white shadow-lg transition-all duration-200 backdrop-blur-xl relative ${dropdownOpen ? 'scale-105 shadow-[0_8px_25px_rgba(102,126,234,0.4)] border-white/40' : 'hover:scale-105 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] hover:border-white/40'}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    {getUserInitials()}
                </div>
                <div className={`absolute top-15 right-0 bg-vocab-surface backdrop-blur-xl border border-white/20 rounded-lg shadow-xl min-w-45 z-[3000] transition-all duration-200 ${dropdownOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-2.5 scale-95'}`}>
                    <div className="px-md py-sm border-b border-black/10 text-auth-text-medium text-sm font-medium">
                        {localStorage.getItem('username')} (Admin)
                    </div>
                    <button
                        className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-t-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                        onClick={() => {
                            console.log('Admin Settings clicked!');
                            loadOwnProfile();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="text-base opacity-80">⚙️</span>
                        Settings
                    </button>
                    <button
                        className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-b-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                        onClick={() => {
                            console.log('Admin Logout clicked!');
                            logout();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="text-base opacity-80">🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Admin Main Container */}
            <div className="w-full max-w-6xl mx-auto px-xl py-xl relative min-h-[calc(100vh-80px)] pb-32">
                {/* Admin Header */}
                <div className="text-center mb-2xl">
                    <h1 className="text-white text-6xl font-extrabold drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] drop-shadow-[0_2px_6px_rgba(102,126,234,0.6)] tracking-tight mb-lg">
                        User Management
                    </h1>
                </div>

                {/* Admin Table */}
                <table className="w-full border-collapse mb-2xl bg-vocab-surface backdrop-blur-xl rounded-xl overflow-hidden shadow-lg border border-white/20">
                    <thead className="bg-gradient-secondary text-white uppercase text-sm font-bold tracking-wider">
                        <tr>
                            <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                                Username
                            </th>
                            <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                                Created
                            </th>
                            <th className="py-3 px-4 text-left border-b border-vocab-border-light">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr 
                                key={user.id}
                                className={`transition-all duration-200 ${
                                    index % 2 === 0 
                                        ? 'bg-white/70' 
                                        : 'bg-vocab-bg/80'
                                } hover:bg-vocab-surface-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]`}
                            >
                                <td className="py-2 px-4 border-b border-vocab-border-light">
                                    <span className="font-montserrat font-semibold text-auth-text-dark py-1 px-2 rounded-sm text-base">
                                        {user.username}
                                    </span>
                                </td>
                                <td className="py-2 px-4 border-b border-vocab-border-light text-auth-text-medium">
                                    {formatRelativeTime(user.created_at)}
                                </td>
                                <td className="py-2 px-4 border-b border-vocab-border-light">
                                    <button
                                        className="p-2 bg-gradient-primary text-white border-none rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-sm min-w-9 hover:bg-gradient-secondary hover:-translate-y-px hover:shadow-sm"
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
        <div className="min-h-screen box-border p-8 overflow-y-auto flex items-start justify-center bg-gradient-auth pt-8">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-12 max-w-2xl w-full shadow-xl border border-white/20 relative animate-slideIn">
                <div className="text-center mb-10">
                    <h1 className="m-0 text-4xl font-bold bg-gradient-text bg-clip-text text-transparent tracking-tight">
                        {selectedUser?.id.toString() ===
                        localStorage.getItem('userId')
                            ? 'My Settings'
                            : 'User Settings'}
                    </h1>
                    <p className="m-0 text-auth-text-medium text-base font-normal leading-relaxed mt-4">
                        {selectedUser?.id.toString() ===
                        localStorage.getItem('userId')
                            ? 'Configure your custom word definition instructions'
                            : `Configure custom instructions for ${selectedUser?.username}`}
                    </p>
                </div>
                <div className="flex flex-col gap-10">
                    <div className="flex flex-col gap-3.5">
                        <label htmlFor="instructions" className="text-sm font-semibold text-auth-text-dark ml-0.5">
                            Custom Word Definition Instructions
                        </label>
                        <textarea
                            id="instructions"
                            placeholder="Enter custom instructions for how words should be defined for this user. Use {word} as placeholder for the word to be defined.

Example:
Define the word '{word}' in a simple way:
**Meaning:** [simple definition]
**Example:** [example sentence]"
                            value={selectedUser?.custom_instructions}
                            onChange={(e) =>
                                setSelectedUser((prev) => ({
                                    ...prev!,
                                    custom_instructions: e.target.value,
                                }))
                            }
                            rows={10}
                            className="w-full p-5 border-2 border-gray-200 rounded-lg text-sm font-mono resize-y min-h-64 transition-all duration-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-auth-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light"
                        />
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                        <button
                            className="px-9 py-5 border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 bg-gradient-primary text-white shadow-vocab-lg hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] active:translate-y-0"
                            onClick={saveUserInstructions}
                        >
                            Save Instructions
                        </button>
                        <button
                            className="px-9 py-5 border-2 border-slate-200 rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 bg-slate-50 text-slate-600 shadow-sm hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
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
            className="min-h-screen font-inter text-auth-text-dark leading-relaxed relative bg-gradient-primary"
            onClick={() => {
                closeHover();
            }}
        >
            {/* Animated background pattern */}
            <div 
                className="fixed inset-0 opacity-10 animate-float -z-10 pointer-events-none"
                style={{
                    backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="30" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`
                }}
            />
            {/* User Avatar and Dropdown */}
            <div className="fixed top-lg right-xl z-[2000] font-inter" ref={dropdownRef}>
                <div
                    className={`w-12 h-12 rounded-full bg-gradient-primary border-3 border-white/20 cursor-pointer flex items-center justify-center text-lg font-semibold text-white shadow-lg transition-all duration-200 backdrop-blur-xl relative ${dropdownOpen ? 'scale-105 shadow-[0_8px_25px_rgba(102,126,234,0.4)] border-white/40' : 'hover:scale-105 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] hover:border-white/40'}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    {getUserInitials()}
                </div>
                <div className={`absolute top-15 right-0 bg-vocab-surface backdrop-blur-xl border border-white/20 rounded-lg shadow-xl min-w-45 z-[3000] transition-all duration-200 ${dropdownOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-2.5 scale-95'}`}>
                    <div className="px-md py-sm border-b border-black/10 text-auth-text-medium text-sm font-medium">
                        {localStorage.getItem('username')}
                    </div>
                    <button
                        className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-t-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                        onClick={() => {
                            console.log('User Settings clicked!');
                            loadOwnProfile();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="text-base opacity-80">⚙️</span>
                        Settings
                    </button>
                    {isAdmin() && (
                        <button
                            className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                            onClick={() => {
                                console.log('Admin Panel clicked!');
                                setView('admin');
                                setDropdownOpen(false);
                            }}
                        >
                            <span className="text-base opacity-80">👤</span>
                            Admin Panel
                        </button>
                    )}
                    <button
                        className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-b-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                        onClick={() => {
                            console.log('User Logout clicked!');
                            logout();
                            setDropdownOpen(false);
                        }}
                    >
                        <span className="text-base opacity-80">🚪</span>
                        Logout
                    </button>
                </div>
            </div>
            
            {/* Main Container */}
            <div className="w-full max-w-6xl mx-auto px-xl py-xl relative min-h-[calc(100vh-80px)] pb-32">
                {/* Header */}
                <h1 className="mx-0 my-0 mb-2xl text-6xl font-extrabold text-center text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] drop-shadow-[0_2px_6px_rgba(102,126,234,0.6)] tracking-tight relative py-sm leading-tight">
                    Vocabulary Builder
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-30 h-1 bg-gradient-primary rounded-sm shadow-[0_2px_8px_rgba(102,126,234,0.3)]" />
                </h1>

                {/* Search and Action Section */}
                <div className="flex items-stretch gap-md mb-lg bg-vocab-surface backdrop-blur-xl rounded-xl p-md shadow-lg border border-white/20">
                    <input
                        id="word"
                        placeholder="Word (type to search)…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="flex-1 px-5 py-3.5 border-2 border-vocab-border rounded-lg text-lg font-medium bg-white/90 text-auth-text-dark transition-all duration-200 shadow-sm focus:outline-none focus:border-vocab-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light placeholder:font-normal"
                    />
                    <button
                        id="addBtn"
                        className={`px-7 py-3.5 border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-200 shadow-lg whitespace-nowrap ${
                            selected.size > 0 
                                ? 'bg-gradient-danger text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(239,68,68,0.4)] active:translate-y-0' 
                                : 'bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] active:translate-y-0'
                        } ${(selected.size > 0 ? false : !q.trim()) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={selected.size > 0 ? handleRemove : handleAdd}
                        disabled={selected.size > 0 ? false : !q.trim()}
                    >
                        {selected.size > 0
                            ? `Remove (${selected.size})`
                            : 'Add Word'}
                    </button>
                </div>

                {/* Vocabulary Table */}
                <table className="w-full border-collapse mb-2xl bg-vocab-surface backdrop-blur-xl rounded-xl overflow-hidden shadow-lg border border-white/20">
                    <thead className="bg-gradient-secondary text-white uppercase text-sm font-bold tracking-wider">
                        <tr>
                            <th className="w-6 text-center py-3 px-1 border-b border-vocab-border-light">
                                {/* Checkbox column */}
                            </th>
                            <th className="w-45 min-w-37.5 py-3 px-4 text-left border-b border-vocab-border-light">
                                Word
                            </th>
                            <th className="w-auto min-w-50 max-w-100 py-3 px-4 text-left border-b border-vocab-border-light">
                                Notes
                            </th>
                            <th className="w-8.75 text-center py-3 px-4 border-b border-vocab-border-light">
                                {/* Dictionary button 1 */}
                            </th>
                            <th className="w-8.75 text-center py-3 px-4 border-b border-vocab-border-light">
                                {/* Dictionary button 2 */}
                            </th>
                            <th className="w-20 text-right py-3 px-4 border-b border-vocab-border-light">
                                Added
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(vocab || []).map((r, index) => (
                            <tr 
                                key={r.word}
                                className={`transition-all duration-200 ${
                                    index % 2 === 0 
                                        ? 'bg-white/70' 
                                        : 'bg-vocab-bg/80'
                                } hover:bg-vocab-surface-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(102,126,234,0.1)]`}
                            >
                                <td className="w-6 text-center py-2 px-1 border-b border-vocab-border-light">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r.word)}
                                        onChange={() => toggleSelect(r.word)}
                                        className="appearance-none w-3 h-3 border-2 border-vocab-border rounded-xs bg-white/90 cursor-pointer transition-all duration-200 relative m-0 hover:border-vocab-primary hover:bg-white hover:scale-105 checked:bg-gradient-primary checked:border-vocab-primary after:checked:content-['✓'] after:checked:absolute after:checked:top-1/2 after:checked:left-1/2 after:checked:transform after:checked:-translate-x-1/2 after:checked:-translate-y-1/2 after:checked:text-white after:checked:text-xs after:checked:font-bold"
                                    />
                                </td>
                                <td className="w-45 min-w-37.5 py-2 px-4 border-b border-vocab-border-light">
                                    <span
                                        className="font-montserrat font-semibold text-auth-text-dark cursor-pointer py-1 px-2 rounded-sm transition-all duration-200 inline-block text-base leading-tight hover:bg-gradient-primary hover:text-white hover:-translate-y-px hover:shadow-sm"
                                        onClick={(e) => openDefinition(e, r.word)}
                                    >
                                        {r.word}
                                    </span>
                                </td>
                                <td className="w-auto min-w-50 py-2 px-4 border-b border-vocab-border-light">
                                    <div className="flex items-center gap-xs w-full">
                                        <span
                                            className="flex-1 cursor-pointer text-sm leading-relaxed text-auth-text-dark transition-colors duration-200 break-words hover:text-vocab-primary"
                                            onClick={() =>
                                                setNotesModal({
                                                    show: true,
                                                    word: r.word,
                                                    note: r.note || '',
                                                })
                                            }
                                        >
                                            {r.note ? (
                                                r.note.length > 50 ? (
                                                    `${r.note.substring(0, 50)}...`
                                                ) : (
                                                    r.note
                                                )
                                            ) : (
                                                <span className="text-auth-text-medium italic text-xs">
                                                    Click to add note
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            className={`notes-btn flex-shrink-0 w-6 h-6 min-w-6 p-1 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs text-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm ${r.note ? 'has-note' : 'no-note'}`}
                                            onClick={() =>
                                                setNotesModal({
                                                    show: true,
                                                    word: r.word,
                                                    note: r.note || '',
                                                })
                                            }
                                            title="Add/Edit Note"
                                        >
                                            {r.note ? (
                                                <span className="text-emerald-600">
                                                    📝
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">
                                                    ➕
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </td>
                                <td className="w-8.75 text-center py-2 px-4 border-b border-vocab-border-light">
                                    <button
                                        className="min-w-7 h-7 p-0.5 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm"
                                        onClick={() =>
                                            window.open(
                                                `https://dictionary.cambridge.org/dictionary/english/${r.word}`,
                                            )
                                        }
                                    >
                                        <img
                                            src="https://dictionary.cambridge.org/favicon.ico"
                                            alt="Cambridge"
                                            className="w-3 h-3"
                                        />
                                    </button>
                                </td>
                                <td className="w-8.75 text-center py-2 px-4 border-b border-vocab-border-light">
                                    <button
                                        className="min-w-7 h-7 p-0.5 bg-white/90 border border-vocab-border rounded-sm cursor-pointer transition-all duration-200 inline-flex items-center justify-center shadow-xs hover:bg-vocab-surface-hover hover:border-vocab-primary hover:-translate-y-px hover:shadow-sm"
                                        onClick={() =>
                                            window.open(
                                                `https://www.merriam-webster.com/dictionary/${r.word}`,
                                            )
                                        }
                                    >
                                        <img
                                            src="https://www.merriam-webster.com/favicon.ico"
                                            alt="MW"
                                            className="w-3 h-3"
                                        />
                                    </button>
                                </td>
                                <td className="w-20 text-right py-2 px-4 border-b border-vocab-border-light text-xs text-auth-text-medium">
                                    {formatRelativeTime(r.add_date)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            <div className="fixed left-1/2 transform -translate-x-1/2 bottom-lg z-[1000] flex justify-center items-center gap-xs px-sm py-sm bg-vocab-surface backdrop-blur-xl border border-white/20 rounded-lg shadow-lg font-inter text-auth-text-dark">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="bg-none border-none text-auth-text-medium text-base px-xs py-xs cursor-pointer rounded-sm transition-all duration-200 font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:not(:disabled):bg-gradient-primary hover:not(:disabled):text-white hover:not(:disabled):-translate-y-px"
                >
                    &lt;
                </button>
                {getVisiblePageNumbers().map((pageNum) => (
                    <span
                        key={pageNum}
                        className={`mx-xs px-xs py-xs text-sm cursor-pointer rounded-sm transition-all duration-200 font-medium min-w-7 text-center pointer-events-auto relative z-10 ${
                            page === pageNum 
                                ? 'font-bold bg-gradient-primary text-white shadow-sm' 
                                : 'hover:bg-black/10 hover:text-vocab-primary'
                        }`}
                        onClick={() => setPage(pageNum)}
                    >
                        {pageNum}
                    </span>
                ))}
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="bg-none border-none text-auth-text-medium text-base px-xs py-xs cursor-pointer rounded-sm transition-all duration-200 font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:not(:disabled):bg-gradient-primary hover:not(:disabled):text-white hover:not(:disabled):-translate-y-px"
                >
                    &gt;
                </button>
            </div>

            {/* Hover Window */}
            {hover.show && (
                <div
                    className="fixed bg-vocab-surface backdrop-blur-xl text-auth-text-dark border border-white/20 rounded-lg shadow-xl p-lg z-[3000] text-base font-inter break-words leading-relaxed cursor-pointer max-w-screen-md min-w-96 animate-hoverFadeIn md:max-w-none md:min-w-auto md:w-auto md:left-auto md:right-auto md:top-auto md:transform-none md:max-h-none md:overflow-visible md:animate-hoverFadeIn"
                    style={{ 
                        left: window.innerWidth <= 768 ? 16 : hover.x, 
                        top: window.innerWidth <= 768 ? '50%' : hover.y,
                        right: window.innerWidth <= 768 ? 16 : 'auto',
                        transform: window.innerWidth <= 768 ? 'translateY(-50%)' : 'none',
                        maxHeight: window.innerWidth <= 768 ? '70vh' : 'none',
                        overflowY: window.innerWidth <= 768 ? 'auto' : 'visible'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <TTSControls content={hover.content} audioRef={audioRef} />
                </div>
            )}

            {/* Notes Modal */}
            {notesModal.show && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] backdrop-blur-sm">
                    <div className="bg-vocab-surface backdrop-blur-xl border border-white/20 rounded-xl p-xl min-w-112 max-w-138 w-4/5 max-h-4/5 overflow-y-auto shadow-xl relative animate-modalFadeIn">
                        <span
                            className="absolute top-md right-md bg-none border-none text-2xl cursor-pointer text-auth-text-medium transition-colors duration-200 w-8 h-8 flex items-center justify-center rounded-sm hover:text-auth-text-dark hover:bg-black/10"
                            onClick={() =>
                                setNotesModal((prev) => ({
                                    ...prev,
                                    show: false,
                                }))
                            }
                        >
                            &times;
                        </span>
                        <h2 className="m-0 mb-lg text-xl font-semibold text-auth-text-dark">
                            Notes for "{notesModal.word}"
                        </h2>
                        <textarea
                            value={notesModal.note}
                            onChange={(e) =>
                                setNotesModal((prev) => ({
                                    ...prev,
                                    note: e.target.value,
                                }))
                            }
                            placeholder="Enter your note here..."
                            rows={6}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm font-mono resize-y min-h-30 box-border transition-all duration-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-auth-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1),0_4px_12px_rgba(0,0,0,0.08)] focus:bg-white focus:-translate-y-px placeholder:text-auth-text-light"
                        />
                        <div className="flex gap-sm mt-lg justify-end">
                            <button
                                className="px-6 py-3 border-none rounded-lg cursor-pointer font-medium text-sm transition-all duration-200 inline-flex items-center justify-center gap-2 bg-gradient-primary text-white hover:-translate-y-px hover:shadow-md"
                                onClick={handleSaveNote}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
