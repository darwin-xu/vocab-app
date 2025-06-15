// client/src/test/notes-integration.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app';
import * as api from '../api';

// Mock all API functions
vi.mock('../api', () => ({
    login: vi.fn(),
    register: vi.fn(),
    fetchVocab: vi.fn(),
    addWord: vi.fn(),
    removeWords: vi.fn(),
    openaiCall: vi.fn(),
    ttsCall: vi.fn(),
    logout: vi.fn(),
    isAdmin: vi.fn().mockReturnValue(false),
    fetchUsers: vi.fn(),
    updateUserProfile: vi.fn(),
    getNote: vi.fn(),
    saveNote: vi.fn(),
    deleteNote: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('Notes Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Start with no token to test login flow
        localStorageMock.getItem.mockReturnValue(null);

        // Mock successful login
        vi.mocked(api.login).mockImplementation(async () => {
            // Simulate setting token after successful login
            localStorageMock.getItem.mockReturnValue('test-token');
            return undefined;
        });

        // Mock vocabulary with notes
        vi.mocked(api.fetchVocab).mockResolvedValue({
            items: [
                {
                    word: 'hello',
                    add_date: '2025-01-01',
                    note: 'This is a greeting',
                },
                { word: 'world', add_date: '2025-01-02', note: null },
                {
                    word: 'vocabulary',
                    add_date: '2025-01-03',
                    note: 'Study words',
                },
            ],
            totalPages: 1,
            currentPage: 1,
        });
    });

    it('should display notes button with correct icons', async () => {
        render(<App />);

        // Login first
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });

        // Check for notes buttons
        const notesButtons = screen.getAllByTitle('Add/Edit Note');
        expect(notesButtons).toHaveLength(3);

        // Check that words with notes show the note icon (📝)
        const helloRow = screen.getByText('hello').closest('tr');
        const vocabRow = screen.getByText('vocabulary').closest('tr');
        const worldRow = screen.getByText('world').closest('tr');

        expect(helloRow?.querySelector('.has-note')).toBeInTheDocument();
        expect(vocabRow?.querySelector('.has-note')).toBeInTheDocument();
        expect(worldRow?.querySelector('.no-note')).toBeInTheDocument();
    });

    it('should open notes modal when clicking notes button', async () => {
        render(<App />);

        // Login
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });

        // Click notes button for 'hello'
        const helloRow = screen.getByText('hello').closest('tr');
        const notesButton = helloRow?.querySelector('.notes-btn');
        expect(notesButton).toBeInTheDocument();

        await user.click(notesButton!);

        // Check if modal opens
        await waitFor(() => {
            expect(screen.getByText('Notes for "hello"')).toBeInTheDocument();
        });

        // Check if existing note is loaded
        const textboxes = screen.getAllByRole('textbox');
        const textarea = textboxes[1]; // The textarea is the second textbox (after the search input)
        expect(textarea).toHaveValue('This is a greeting');
    });

    it('should save note when clicking save button', async () => {
        vi.mocked(api.saveNote).mockResolvedValue(undefined);

        render(<App />);

        // Login
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('world')).toBeInTheDocument();
        });

        // Click notes button for 'world' (which has no note)
        const worldRow = screen.getByText('world').closest('tr');
        const notesButton = worldRow?.querySelector('.notes-btn');

        await user.click(notesButton!);

        // Wait for modal to open
        await waitFor(() => {
            expect(screen.getByText('Notes for "world"')).toBeInTheDocument();
        });

        // Add a note
        const textboxes = screen.getAllByRole('textbox');
        const textarea = textboxes[1]; // The textarea is the second textbox (after the search input)
        await user.clear(textarea);
        await user.type(textarea, 'This is our planet');

        // Click save
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);

        // Verify API was called
        expect(api.saveNote).toHaveBeenCalledWith(
            'world',
            'This is our planet',
        );

        // Verify modal closes and vocab reloads
        await waitFor(() => {
            expect(
                screen.queryByText('Notes for "world"'),
            ).not.toBeInTheDocument();
        });
        expect(api.fetchVocab).toHaveBeenCalledTimes(2); // Once on load, once after save
    });

    it('should delete note when clearing text and clicking save', async () => {
        vi.mocked(api.saveNote).mockResolvedValue(undefined);

        render(<App />);

        // Login
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });

        // Click notes button for 'hello' (which has a note)
        const helloRow = screen.getByText('hello').closest('tr');
        const notesButton = helloRow?.querySelector('.notes-btn');

        await user.click(notesButton!);

        // Wait for modal to open
        await waitFor(() => {
            expect(screen.getByText('Notes for "hello"')).toBeInTheDocument();
        });

        // Find textarea and clear the text
        const textarea = screen.getByPlaceholderText('Enter your note here...');

        // Clear the text
        await user.clear(textarea);

        // Click save (this should delete the note by sending empty string)
        const saveButton = screen.getByText('Save');
        await user.click(saveButton);

        // Verify API was called with empty string
        expect(api.saveNote).toHaveBeenCalledWith('hello', '');

        // Verify modal closes and vocab reloads
        await waitFor(() => {
            expect(
                screen.queryByText('Notes for "hello"'),
            ).not.toBeInTheDocument();
        });
        expect(api.fetchVocab).toHaveBeenCalledTimes(2); // Once on load, once after save
    });

    it('should close modal when clicking X button', async () => {
        render(<App />);

        // Login
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });

        // Click notes button
        const helloRow = screen.getByText('hello').closest('tr');
        const notesButton = helloRow?.querySelector('.notes-btn');

        await user.click(notesButton!);

        // Wait for modal to open
        await waitFor(() => {
            expect(screen.getByText('Notes for "hello"')).toBeInTheDocument();
        });

        // Click X button
        const closeButton = screen.getByText('×');
        await user.click(closeButton);

        // Verify modal closes
        await waitFor(() => {
            expect(
                screen.queryByText('Notes for "hello"'),
            ).not.toBeInTheDocument();
        });
    });

    it('should only show save button (simplified modal)', async () => {
        render(<App />);

        // Login
        const user = userEvent.setup();
        await user.type(
            screen.getByPlaceholderText('Enter your username'),
            'testuser',
        );
        await user.type(
            screen.getByPlaceholderText('Enter your password'),
            'testpass',
        );
        await user.click(screen.getByRole('button', { name: 'Sign In' }));

        // Wait for vocabulary to load
        await waitFor(() => {
            expect(screen.getByText('world')).toBeInTheDocument();
        });

        // Click notes button for 'world' (which has no note)
        const worldRow = screen.getByText('world').closest('tr');
        const notesButton = worldRow?.querySelector('.notes-btn');

        await user.click(notesButton!);

        // Wait for modal to open
        await waitFor(() => {
            expect(screen.getByText('Notes for "world"')).toBeInTheDocument();
        });

        // Should only have Save button and X close button
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('×')).toBeInTheDocument();

        // Should not have Delete or Cancel buttons
        expect(screen.queryByText('Delete Note')).not.toBeInTheDocument();
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
});
