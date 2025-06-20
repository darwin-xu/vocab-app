import { useState, useCallback } from 'react';
import {
    fetchUsers,
    fetchUserDetails,
    updateUserInstructions,
    fetchOwnProfile,
    updateOwnProfile,
    isAdmin,
} from '../api';
import type { User, UserDetails, ViewType } from '../types';

export function useAdmin() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);

    // Load users for admin
    const loadUsers = useCallback(async () => {
        try {
            const data = await fetchUsers();
            setUsers(data.users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }, []);

    // Load user details for settings
    const loadUserDetails = useCallback(async (userId: string) => {
        try {
            const data = await fetchUserDetails(userId);
            setSelectedUser(data.user);
            return data.user;
        } catch (error) {
            console.error('Error loading user details:', error);
            throw error;
        }
    }, []);

    // Load own profile
    const loadOwnProfile = useCallback(async () => {
        try {
            console.log('Loading own profile...');
            const data = await fetchOwnProfile();
            console.log('Own profile data:', data);

            // Store user ID for comparison
            localStorage.setItem('userId', data.user.id.toString());

            // Reuse the existing user-settings view by setting selectedUser to current user's data
            const userDetails: UserDetails = {
                id: data.user.id,
                username: data.user.username,
                custom_instructions: data.user.custom_instructions || '',
            };

            setSelectedUser(userDetails);
            return userDetails;
        } catch (error) {
            console.error('Error loading own profile:', error);
            throw error;
        }
    }, []);

    // Save user instructions
    const saveUserInstructions = useCallback(
        async (user: UserDetails, onSuccess: (view: ViewType) => void) => {
            try {
                // Check if user is editing their own profile
                const currentUserId = localStorage.getItem('userId');
                const isOwnProfile =
                    currentUserId && user.id.toString() === currentUserId;

                if (isOwnProfile) {
                    // Use own profile API
                    await updateOwnProfile(user.custom_instructions);
                } else {
                    // Use admin API for managing other users
                    await updateUserInstructions(
                        user.id.toString(),
                        user.custom_instructions,
                    );
                }

                onSuccess(isAdmin() ? 'admin' : 'vocab');
                setSelectedUser(null);
            } catch (error) {
                console.error('Error saving user instructions:', error);
                throw error;
            }
        },
        [],
    );

    return {
        users,
        selectedUser,
        setSelectedUser,
        loadUsers,
        loadUserDetails,
        loadOwnProfile,
        saveUserInstructions,
    };
}
