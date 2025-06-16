import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import './setup'; // Ensure setup is loaded
import App from '../app';
import * as api from '../api';

// Mock the API module
vi.mock('../api', () => ({
    login: vi.fn(),
    register: vi.fn(),
    fetchVocab: vi.fn(),
    addWord: vi.fn(),
    removeWords: vi.fn(),
    logout: vi.fn(),
    isAdmin: vi.fn(),
    fetchUsers: vi.fn(),
    fetchUserDetails: vi.fn(),
    updateUserInstructions: vi.fn(),
    fetchOwnProfile: vi.fn(),
    updateOwnProfile: vi.fn(),
    openaiCall: vi.fn(),
    ttsCall: vi.fn(),
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear localStorage to ensure tests start from unauthenticated state
        localStorage.clear();
        // Reset all API mocks
        vi.mocked(api.isAdmin).mockReturnValue(false);
    });

    describe('Authentication Flow', () => {
        beforeEach(() => {
            // Ensure clean state for authentication tests
            localStorage.clear();
        });

        it('should render login form initially', () => {
            render(<App />);

            expect(
                screen.getByPlaceholderText('Enter your username'),
            ).toBeInTheDocument();
            expect(
                screen.getByPlaceholderText('Enter your password'),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'Sign In' }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'Create Account' }),
            ).toBeInTheDocument();
        });

        it('should handle successful login', async () => {
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [],
                totalPages: 0,
                currentPage: 1,
            });

            render(<App />);
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

            await waitFor(() => {
                expect(api.login).toHaveBeenCalledWith('testuser', 'testpass');
            });
        });

        it('should handle login error', async () => {
            vi.mocked(api.login).mockRejectedValue(
                new Error('Invalid credentials'),
            );

            render(<App />);
            const user = userEvent.setup();

            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'wronguser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'wrongpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(
                    screen.getByText('Invalid credentials'),
                ).toBeInTheDocument();
            });
        });

        it('should handle successful registration', async () => {
            vi.mocked(api.register).mockResolvedValue(undefined);

            render(<App />);
            const user = userEvent.setup();

            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'newuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'newpass',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create Account' }),
            );

            await waitFor(() => {
                expect(api.register).toHaveBeenCalledWith('newuser', 'newpass');
            });
        });

        it('should handle registration error', async () => {
            vi.mocked(api.register).mockRejectedValue(
                new Error('Username already exists'),
            );

            render(<App />);
            const user = userEvent.setup();

            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'existinguser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'password',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create Account' }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText('Username already exists'),
                ).toBeInTheDocument();
            });
        });

        it('should validate required fields', async () => {
            render(<App />);
            const user = userEvent.setup();

            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            // Should show validation message or prevent submission
            expect(api.login).not.toHaveBeenCalled();
        });
    });

    describe('Vocabulary Management', () => {
        beforeEach(() => {
            // Mock API calls
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [
                    { word: 'hello', add_date: '2025-01-01' },
                    { word: 'world', add_date: '2025-01-02' },
                ],
                totalPages: 1,
                currentPage: 1,
            });
        });

        it('should display vocabulary list after login', async () => {
            render(<App />);
            const user = userEvent.setup();

            // Perform login
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            // Wait for vocabulary to load and display
            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
                expect(screen.getByText('world')).toBeInTheDocument();
            });
        });

        it('should add new vocabulary word', async () => {
            vi.mocked(api.addWord).mockResolvedValue(undefined);

            // Mock updated vocab list after adding
            vi.mocked(api.fetchVocab)
                .mockResolvedValueOnce({
                    items: [
                        { word: 'hello', add_date: '2025-01-01' },
                        { word: 'world', add_date: '2025-01-02' },
                    ],
                    totalPages: 1,
                    currentPage: 1,
                })
                .mockResolvedValueOnce({
                    items: [
                        { word: 'hello', add_date: '2025-01-01' },
                        { word: 'world', add_date: '2025-01-02' },
                        { word: 'newword', add_date: '2025-01-03' },
                    ],
                    totalPages: 1,
                    currentPage: 1,
                });

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
            });

            // Add new word
            const addInput = screen.getByPlaceholderText(/search/i);
            await user.type(addInput, 'newword');
            await user.click(screen.getByRole('button', { name: /add/i }));

            await waitFor(() => {
                expect(api.addWord).toHaveBeenCalledWith('newword');
            });
        });

        it('should handle search functionality', async () => {
            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
            });

            // Search for words
            const searchInput = screen.getByPlaceholderText(/search/i);
            await user.type(searchInput, 'hello');

            await waitFor(() => {
                expect(api.fetchVocab).toHaveBeenCalledWith(
                    'hello',
                    1,
                    expect.any(Number),
                );
            });
        });

        it('should handle pagination', async () => {
            // Mock multiple pages
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [{ word: 'hello', add_date: '2025-01-01' }],
                totalPages: 2,
                currentPage: 1,
            });

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(
                    screen.getByRole('button', { name: '>' }),
                ).not.toBeDisabled();
            });

            const nextButton = screen.getByRole('button', { name: '>' });

            await user.click(nextButton);

            await waitFor(() => {
                expect(api.fetchVocab).toHaveBeenCalledWith(
                    '',
                    2,
                    expect.any(Number),
                );
            });
        });

        it('should delete selected words', async () => {
            vi.mocked(api.removeWords).mockResolvedValue(undefined);

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
            });

            // Select words for deletion
            const checkboxes = screen.getAllByRole('checkbox');
            await user.click(checkboxes[0]); // Select first word

            // Click delete button
            const removeButton = screen.getByRole('button', {
                name: /remove/i,
            });
            await user.click(removeButton);

            await waitFor(() => {
                expect(api.removeWords).toHaveBeenCalledWith(['hello']);
            });
        });
    });

    describe('Admin Functionality', () => {
        beforeEach(() => {
            vi.mocked(api.isAdmin).mockReturnValue(true);
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchUsers).mockResolvedValue({
                users: [
                    { id: 1, username: 'user1', created_at: '2025-01-01' },
                    { id: 2, username: 'user2', created_at: '2025-01-02' },
                ],
            });
        });

        it('should show admin panel for admin users', async () => {
            render(<App />);
            const user = userEvent.setup();

            // Login as admin
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'admin',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'adminpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByText('User Management')).toBeInTheDocument();
                expect(screen.getByText('user1')).toBeInTheDocument();
                expect(screen.getByText('user2')).toBeInTheDocument();
            });
        });

        it('should not show admin panel for regular users', async () => {
            vi.mocked(api.isAdmin).mockReturnValue(false);
            localStorage.setItem('isAdmin', 'false');

            render(<App />);
            const user = userEvent.setup();

            // Login as regular user
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'user',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'userpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(
                    screen.queryByText('Admin Panel'),
                ).not.toBeInTheDocument();
            });
        });
    });

    describe('AI Integration', () => {
        beforeEach(() => {
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [],
                totalPages: 0,
                currentPage: 1,
            });
        });

        it('should make OpenAI API call', async () => {
            vi.mocked(api.openaiCall).mockResolvedValue('AI response');

            // provide vocab items so a word is rendered
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [{ word: 'hello', add_date: '2025-01-01' }],
                totalPages: 1,
                currentPage: 1,
            });

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            // click word to directly show definition
            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
            });

            await user.click(screen.getByText('hello'));

            await waitFor(() => {
                expect(api.openaiCall).toHaveBeenCalledWith('hello', 'define');
            });
        });

        it('should handle TTS functionality', async () => {
            const mockAudioData = 'base64audiodata';
            vi.mocked(api.ttsCall).mockResolvedValue(mockAudioData);
            // Mock a properly formatted AI response with markdown structure
            const mockAIResponse = `# hello

**Pronunciation:** /həˈloʊ/

## Noun

**Definition:** An expression or gesture of greeting.

**Examples:**
- She gave a friendly hello to her neighbor.
- His hello was warm and welcoming.

## Interjection

**Definition:** Used as a greeting or to begin a phone conversation.

**Examples:**
- Hello! How are you today?
- Hello, is anyone there?

## Synonyms

hi, greetings, salutation, welcome`;

            vi.mocked(api.openaiCall).mockResolvedValue(mockAIResponse);

            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [{ word: 'hello', add_date: '2025-01-01' }],
                totalPages: 1,
                currentPage: 1,
            });

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            await waitFor(() => {
                expect(screen.getByText('hello')).toBeInTheDocument();
            });

            // click word to directly show definition
            await user.click(screen.getByText('hello'));

            await waitFor(() => {
                expect(api.openaiCall).toHaveBeenCalledWith('hello', 'define');
            });
            
            // Find an inline TTS button in the hover window (should be next to the word title)
            const ttsButton = await screen.findByRole('button', { name: 'Listen to full definition' });
            await user.click(ttsButton);

            await waitFor(() => {
                expect(api.ttsCall).toHaveBeenCalled();
            });
        });
    });

    describe('User Settings', () => {
        beforeEach(() => {
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchOwnProfile).mockResolvedValue({
                user: {
                    id: 1,
                    username: 'testuser',
                    custom_instructions: 'My instructions',
                },
            });
        });

        it('should display user settings', async () => {
            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            // Navigate to settings
            const settingsButton = screen.getByText('Settings');
            await user.click(settingsButton);

            await waitFor(() => {
                expect(screen.getByText('My instructions')).toBeInTheDocument();
            });
        });

        it('should update user profile', async () => {
            vi.mocked(api.updateOwnProfile).mockResolvedValue(undefined);

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            // Navigate to settings
            await user.click(screen.getByText('Settings'));

            await waitFor(() => {
                expect(
                    screen.getByDisplayValue('My instructions'),
                ).toBeInTheDocument();
            });

            // Update instructions
            const instructionsInput =
                screen.getByDisplayValue('My instructions');
            await user.clear(instructionsInput);
            await user.type(instructionsInput, 'Updated instructions');

            const saveButton = screen.getByRole('button', { name: /save/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(api.updateOwnProfile).toHaveBeenCalledWith(
                    'Updated instructions',
                );
            });
        });
    });

    describe('Logout Functionality', () => {
        it('should handle logout', async () => {
            vi.mocked(api.login).mockResolvedValue(undefined);
            vi.mocked(api.fetchVocab).mockResolvedValue({
                items: [],
                totalPages: 0,
                currentPage: 1,
            });

            render(<App />);
            const user = userEvent.setup();

            // Login first
            await user.type(
                screen.getByPlaceholderText('Enter your username'),
                'testuser',
            );
            await user.type(
                screen.getByPlaceholderText('Enter your password'),
                'testpass',
            );
            await user.click(screen.getByRole('button', { name: 'Sign In' }));

            const logoutButton = await screen.findByText('Logout');
            await user.click(logoutButton);

            await waitFor(() => {
                expect(api.logout).toHaveBeenCalled();
            });
        });
    });
});
