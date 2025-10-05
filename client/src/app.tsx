import { useState, useEffect, useRef } from 'react';
import './components.css';
import { login, register, isAdmin } from './api';

// Import new components and hooks
import { useWindowSize } from './hooks/useWindowSize';
import { useVocabulary } from './hooks/useVocabulary';
import { useAdmin } from './hooks/useAdmin';
import { calculatePageSize } from './utils/helpers';
import type { ViewType } from './types';
import { AuthForm } from './components/Auth/AuthForm';
import { AddWordForm } from './components/Vocabulary/AddWordForm';
import { VocabTable } from './components/Vocabulary/VocabTable';
import { Pagination } from './components/Vocabulary/Pagination';
import { NotesModal } from './components/Vocabulary/NotesModal';
import { DefinitionWindow } from './components/Vocabulary/DefinitionWindow';
import { AdminPanel } from './components/Admin/AdminPanel';
import { UserSettings } from './components/Admin/UserSettings';
import { UserAvatar } from './components/UI/UserAvatar';
import { LayoutWithBackground } from './components/UI/LayoutWithBackground';
import { SessionDebugPanel } from './components/Debug/SessionDebugPanel';

function App() {
    const { height: windowHeight } = useWindowSize();
    const pageSize = calculatePageSize(windowHeight);
    const prevPageSizeRef = useRef(pageSize);

    // State declarations first
    const [view, setView] = useState<ViewType>('auth');
    const [authMsg, setAuthMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showDebugPanel, setShowDebugPanel] = useState(false);

    // Use vocabulary hook for vocabulary-related state and functions
    const {
        q,
        vocab,
        page,
        totalPages,
        selected,
        hover,
        notesModal,
        setQ,
        setPage,
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
    } = useVocabulary(pageSize, view === 'vocab');

    // Use admin hook for admin-related state and functions
    const {
        users,
        selectedUser,
        setSelectedUser,
        loadUsers,
        loadUserDetails,
        loadOwnProfile,
        saveUserInstructions,
    } = useAdmin();

    // Avatar dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);

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
        if (prevPageSizeRef.current !== pageSize) {
            prevPageSizeRef.current = pageSize;
            if (view === 'vocab' && page > 1) {
                setPage(1);
            }
        }
    }, [pageSize, view, page, setPage]);

    // Load data based on current view and dependencies
    useEffect(() => {
        if (view === 'admin') loadUsers();
    }, [view, loadUsers]);

    // Handle loading user details for admin panel
    async function handleUserDetailsClick(userId: string) {
        try {
            await loadUserDetails(userId);
            setView('user-settings');
        } catch (error) {
            console.error('Error loading user details:', error);
        }
    }

    // Handle loading own profile
    async function handleOwnProfileLoad() {
        try {
            await loadOwnProfile();
            setView('user-settings');
        } catch (error) {
            console.error('Error loading own profile:', error);
        }
    }

    // Handle saving user instructions
    async function handleSaveUserInstructions() {
        if (!selectedUser) return;
        try {
            await saveUserInstructions(selectedUser, setView);
        } catch (error) {
            console.error('Error saving user instructions:', error);
        }
    }

    // Handle canceling user settings
    function handleCancelUserSettings() {
        setView(isAdmin() ? 'admin' : 'vocab');
        setSelectedUser(null);
    }

    async function handleAuth(
        username: string,
        password: string,
        isRegister = false,
    ) {
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

    return view === 'auth' ? (
        <AuthForm
            onSubmit={handleAuth}
            isLoading={isLoading}
            errorMessage={authMsg}
        />
    ) : view === 'admin' ? (
        <LayoutWithBackground onClick={closeHover}>
            <UserAvatar
                isDropdownOpen={dropdownOpen}
                onDropdownToggle={() => setDropdownOpen(!dropdownOpen)}
                onSettingsClick={handleOwnProfileLoad}
                onAdminPanelClick={() => setView('admin')}
                onDebugPanelClick={() => setShowDebugPanel(true)}
            />
            <AdminPanel
                users={users}
                onUserDetailsClick={handleUserDetailsClick}
            />
        </LayoutWithBackground>
    ) : view === 'user-settings' ? (
        selectedUser && (
            <UserSettings
                selectedUser={selectedUser}
                onSave={handleSaveUserInstructions}
                onCancel={handleCancelUserSettings}
                onUserChange={setSelectedUser}
            />
        )
    ) : (
        // Regular vocabulary interface
        <LayoutWithBackground onClick={closeHover}>
            <UserAvatar
                isDropdownOpen={dropdownOpen}
                onDropdownToggle={() => setDropdownOpen(!dropdownOpen)}
                onSettingsClick={handleOwnProfileLoad}
                onAdminPanelClick={() => setView('admin')}
                onDebugPanelClick={() => setShowDebugPanel(true)}
            />

            {/* Main Container */}
            <div className="w-full max-w-6xl mx-auto px-sm sm:px-md md:px-lg lg:px-xl py-xl relative min-h-[calc(100vh-80px)] pb-32">
                {/* Header */}
                <h1 className="mx-0 my-0 mb-lg text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-center text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] drop-shadow-[0_2px_6px_rgba(102,126,234,0.6)] tracking-tight relative py-sm leading-tight">
                    Vocabulary Builder
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-30 h-1 bg-gradient-primary rounded-sm shadow-[0_2px_8px_rgba(102,126,234,0.3)]" />
                </h1>

                {/* Search and Action Section */}
                <AddWordForm
                    query={q}
                    onQueryChange={setQ}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    selectedCount={selected.size}
                />

                {/* Vocabulary Table */}
                <VocabTable
                    vocab={vocab}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onWordClick={openDefinition}
                    onNotesClick={handleNotesClick}
                    onDictionaryClick={handleDictionaryClick}
                />
            </div>

            {/* Pagination */}
            <div className="fixed left-1/2 transform -translate-x-1/2 bottom-lg z-[1000]">
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {/* Hover Window */}
            <DefinitionWindow
                isVisible={hover.show}
                x={hover.x}
                y={hover.y}
                content={hover.content}
                word={hover.word}
            />

            {/* Notes Modal */}
            <NotesModal
                isOpen={notesModal.show}
                word={notesModal.word}
                note={notesModal.note}
                onClose={closeNotesModal}
                onSave={handleSaveNote}
                onNoteChange={(note) =>
                    setNotesModal((prev) => ({ ...prev, note }))
                }
            />

            {/* Debug Panel - Always show for admin */}
            {showDebugPanel && <SessionDebugPanel onClose={() => setShowDebugPanel(false)} />}
        </LayoutWithBackground>
    );
}

export default App;
