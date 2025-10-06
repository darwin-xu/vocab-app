// Type definitions for the vocabulary app

export interface VocabItem {
    word: string;
    add_date: string;
    note?: string;
}

export interface User {
    id: number;
    username: string;
    created_at: string;
}

export interface UserDetails {
    id: number;
    username: string;
    custom_instructions: string;
}

export interface HoverState {
    show: boolean;
    x: number;
    y: number;
    content: string;
    word?: string;
    isLoading?: boolean;
}

export interface NotesModalState {
    show: boolean;
    word: string;
    note: string;
}

export type ViewType = 'auth' | 'vocab' | 'admin' | 'user-settings';
