import { useRef, useEffect } from 'react';
import { logout, isAdmin } from '../../api';

interface UserAvatarProps {
    isDropdownOpen: boolean;
    onDropdownToggle: () => void;
    onSettingsClick: () => void;
    onAdminPanelClick: () => void;
    onDebugPanelClick?: () => void;
}

export function UserAvatar({
    isDropdownOpen,
    onDropdownToggle,
    onSettingsClick,
    onAdminPanelClick,
    onDebugPanelClick,
}: UserAvatarProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                onDropdownToggle();
            }
        }

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isDropdownOpen, onDropdownToggle]);

    const handleLogout = () => {
        logout();
        onDropdownToggle();
    };

    const handleSettings = () => {
        onSettingsClick();
        onDropdownToggle();
    };

    const handleAdminPanel = () => {
        onAdminPanelClick();
        onDropdownToggle();
    };

    const handleDebugPanel = () => {
        if (onDebugPanelClick) {
            onDebugPanelClick();
            onDropdownToggle();
        }
    };

    return (
        <div
            className="fixed top-lg right-xl z-[2000] font-inter"
            ref={dropdownRef}
        >
            <div
                className={`w-12 h-12 rounded-full bg-gradient-primary border-3 border-white/20 cursor-pointer flex items-center justify-center text-lg font-semibold text-white shadow-lg transition-all duration-200 backdrop-blur-xl relative ${isDropdownOpen ? 'scale-105 shadow-[0_8px_25px_rgba(102,126,234,0.4)] border-white/40' : 'hover:scale-105 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] hover:border-white/40'}`}
                onClick={onDropdownToggle}
            >
                {getUserInitials()}
            </div>
            <div
                className={`absolute top-15 right-0 bg-vocab-surface backdrop-blur-xl border border-white/20 rounded-lg shadow-xl min-w-45 z-[3000] transition-all duration-200 ${isDropdownOpen ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible -translate-y-2.5 scale-95'}`}
            >
                <div className="px-md py-sm border-b border-black/10 text-auth-text-medium text-sm font-medium">
                    {localStorage.getItem('username')} {isAdmin() && '(Admin)'}
                </div>
                <button
                    className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-t-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                    onClick={handleSettings}
                >
                    <span className="text-base opacity-80">⚙️</span>
                    Settings
                </button>
                {isAdmin() && (
                    <button
                        className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                        onClick={handleAdminPanel}
                    >
                        <span className="text-base opacity-80">👤</span>
                        Admin Panel
                    </button>
                )}
                <button
                    className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                    onClick={handleDebugPanel}
                >
                    <span className="text-base opacity-80">🔍</span>
                    Session Debug
                </button>
                <button
                    className="flex items-center gap-sm px-md py-sm text-auth-text-dark text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-none w-full text-left rounded-b-lg hover:bg-gradient-primary hover:text-white hover:translate-x-1"
                    onClick={handleLogout}
                >
                    <span className="text-base opacity-80">🚪</span>
                    Logout
                </button>
            </div>
        </div>
    );
}
