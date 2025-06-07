// test/integration.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../src/index';
import {
    createTestUser,
    addTestVocab,
    cleanupDatabase,
    makeAuthenticatedRequest,
    assertResponse,
    assertJsonResponse,
    DatabaseValidator,
    initializeTestDatabase
} from './helpers/test-utils';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Integration Tests', () => {
    beforeAll(async () => {
        // Initialize database schema
        await initializeTestDatabase();
    });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    describe('Complete User Journey', () => {
        it('should handle complete user registration, login, and vocabulary management flow', async () => {
            // 1. Register a new user
            const registerRequest = new IncomingRequest('http://example.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'journeyuser', password: 'testpass' })
            });

            const ctx1 = createExecutionContext();
            const registerResponse = await worker.fetch(registerRequest, env, ctx1);
            await waitOnExecutionContext(ctx1);

            await assertResponse(registerResponse, 200, 'OK');
            await DatabaseValidator.assertUserExists('journeyuser', true);

            // 2. Login with the new user
            const loginRequest = new IncomingRequest('http://example.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'journeyuser', password: 'testpass' })
            });

            const ctx2 = createExecutionContext();
            const loginResponse = await worker.fetch(loginRequest, env, ctx2);
            await waitOnExecutionContext(ctx2);

            const loginData = await assertJsonResponse(loginResponse, 200);
            expect(loginData.token).toBeTruthy();
            expect(loginData.is_admin).toBe(0);

            const token = loginData.token;

            // 3. Fetch empty vocabulary list
            const emptyVocabResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', token
            );

            const emptyVocabData = await assertJsonResponse(emptyVocabResponse, 200);
            expect(emptyVocabData.items).toHaveLength(0);
            expect(emptyVocabData.totalPages).toBe(0);

            // 4. Add some vocabulary words
            const wordsToAdd = ['hello', 'world', 'vocabulary', 'testing'];

            for (const word of wordsToAdd) {
                const addResponse = await makeAuthenticatedRequest(
                    'http://example.com/vocab', token, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word })
                }
                );

                await assertResponse(addResponse, 200, 'OK');
            }

            // 5. Fetch updated vocabulary list
            const vocabResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', token
            );

            const vocabData = await assertJsonResponse(vocabResponse, 200);
            expect(vocabData.items).toHaveLength(4);
            expect(vocabData.items.map(item => item.word)).toEqual(
                expect.arrayContaining(wordsToAdd)
            );

            // 6. Search for specific words
            const searchResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab?q=hello', token
            );

            const searchData = await assertJsonResponse(searchResponse, 200);
            expect(searchData.items).toHaveLength(1);
            expect(searchData.items[0].word).toBe('hello');

            // 7. Delete some words
            const deleteResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', token, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: ['hello', 'world'] })
            }
            );

            await assertResponse(deleteResponse, 200, 'OK');

            // 8. Verify deletion
            const finalVocabResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', token
            );

            const finalVocabData = await assertJsonResponse(finalVocabResponse, 200);
            expect(finalVocabData.items).toHaveLength(2);
            expect(finalVocabData.items.map(item => item.word)).toEqual(
                expect.arrayContaining(['vocabulary', 'testing'])
            );
            expect(finalVocabData.items.map(item => item.word)).not.toContain('hello');
            expect(finalVocabData.items.map(item => item.word)).not.toContain('world');
        });

        it('should handle admin workflow', async () => {
            // 1. Create admin and regular users
            const admin = await createTestUser('admin', 'adminpass', true);
            const user1 = await createTestUser('user1', 'pass1');
            const user2 = await createTestUser('user2', 'pass2');

            // 2. Add vocabulary for users
            await addTestVocab(user1.id, [
                { word: 'user1word1', add_date: '2025-01-01' },
                { word: 'user1word2', add_date: '2025-01-02' }
            ]);

            await addTestVocab(user2.id, [
                { word: 'user2word1', add_date: '2025-01-01' }
            ]);

            // 3. Admin fetches all users
            const usersResponse = await makeAuthenticatedRequest(
                'http://example.com/admin/users', admin.token
            );

            const usersData = await assertJsonResponse(usersResponse, 200);
            expect(usersData).toHaveLength(3); // admin + 2 users
            expect(usersData.map(u => u.username)).toContain('admin');
            expect(usersData.map(u => u.username)).toContain('user1');
            expect(usersData.map(u => u.username)).toContain('user2');

            // 4. Admin fetches user details
            const userDetailsResponse = await makeAuthenticatedRequest(
                `http://example.com/admin/users/${user1.id}`, admin.token
            );

            const userDetails = await assertJsonResponse(userDetailsResponse, 200);
            expect(userDetails.id).toBe(user1.id);
            expect(userDetails.username).toBe('user1');

            // 5. Admin updates user instructions
            const updateResponse = await makeAuthenticatedRequest(
                `http://example.com/admin/users/${user1.id}`, admin.token, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: 'Admin set instructions' })
            }
            );

            await assertResponse(updateResponse, 200, 'OK');
            await DatabaseValidator.assertUserInstructions(user1.id, 'Admin set instructions');

            // 6. Regular user cannot access admin endpoints
            const unauthorizedResponse = await makeAuthenticatedRequest(
                'http://example.com/admin/users', user1.token
            );

            await assertResponse(unauthorizedResponse, 403, 'Admin access required');
        });
    });

    describe('Data Isolation', () => {
        it('should ensure users can only access their own data', async () => {
            // Create two users
            const user1 = await createTestUser('user1', 'pass1');
            const user2 = await createTestUser('user2', 'pass2');

            // Add vocabulary for both users
            await addTestVocab(user1.id, [
                { word: 'user1private', add_date: '2025-01-01' }
            ]);

            await addTestVocab(user2.id, [
                { word: 'user2private', add_date: '2025-01-01' }
            ]);

            // User1 fetches vocabulary - should only see their own
            const user1VocabResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', user1.token
            );

            const user1VocabData = await assertJsonResponse(user1VocabResponse, 200);
            expect(user1VocabData.items).toHaveLength(1);
            expect(user1VocabData.items[0].word).toBe('user1private');

            // User2 fetches vocabulary - should only see their own
            const user2VocabResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', user2.token
            );

            const user2VocabData = await assertJsonResponse(user2VocabResponse, 200);
            expect(user2VocabData.items).toHaveLength(1);
            expect(user2VocabData.items[0].word).toBe('user2private');

            // User1 tries to delete user2's vocabulary - should only affect their own
            const deleteResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab', user1.token, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: ['user2private'] })
            }
            );

            await assertResponse(deleteResponse, 200, 'OK');

            // Verify user2's vocabulary is still intact
            await DatabaseValidator.assertVocabExists(user2.id, 'user2private', true);
            // Verify user1's vocabulary is unchanged (they had no word to delete)
            await DatabaseValidator.assertVocabExists(user1.id, 'user1private', true);
        });
    });

    describe('Error Handling', () => {
        it('should handle various error scenarios gracefully', async () => {
            // 1. Test unauthenticated requests
            const unauthRequest = new IncomingRequest('http://example.com/vocab');
            const ctx1 = createExecutionContext();
            const unauthResponse = await worker.fetch(unauthRequest, env, ctx1);
            await waitOnExecutionContext(ctx1);

            await assertResponse(unauthResponse, 401, 'Unauthorized');

            // 2. Test invalid JSON
            const invalidJsonRequest = new IncomingRequest('http://example.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json'
            });

            const ctx2 = createExecutionContext();
            const invalidJsonResponse = await worker.fetch(invalidJsonRequest, env, ctx2);
            await waitOnExecutionContext(ctx2);

            // Should handle gracefully (might return 400 or other appropriate error)
            expect(invalidJsonResponse.status).toBeGreaterThanOrEqual(400);

            // 3. Test duplicate username registration
            await createTestUser('testuser', 'testpass');

            const duplicateRequest = new Request('http://example.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'testuser', password: 'newpass' })
            });

            const ctx3 = createExecutionContext();
            const duplicateResponse = await worker.fetch(duplicateRequest, env, ctx3);
            await waitOnExecutionContext(ctx3);

            await assertResponse(duplicateResponse, 409, 'Username already exists');

            // 4. Test non-existent endpoints
            const notFoundRequest = new IncomingRequest('http://example.com/nonexistent');
            const ctx4 = createExecutionContext();
            const notFoundResponse = await worker.fetch(notFoundRequest, env, ctx4);
            await waitOnExecutionContext(ctx4);

            expect(notFoundResponse.status).toBe(404);
        });
    });

    describe('Pagination and Search', () => {
        it('should handle large datasets with pagination and search', async () => {
            const user = await createTestUser('testuser', 'testpass');

            // Add many vocabulary words
            const words = Array.from({ length: 25 }, (_, i) => ({
                word: `word${i.toString().padStart(2, '0')}`,
                add_date: '2025-01-01'
            }));

            await addTestVocab(user.id, words);

            // Test pagination
            const page1Response = await makeAuthenticatedRequest(
                'http://example.com/vocab?page=1&pageSize=10', user.token
            );

            const page1Data = await assertJsonResponse(page1Response, 200);
            expect(page1Data.items).toHaveLength(10);
            expect(page1Data.currentPage).toBe(1);
            expect(page1Data.totalPages).toBe(3);

            const page2Response = await makeAuthenticatedRequest(
                'http://example.com/vocab?page=2&pageSize=10', user.token
            );

            const page2Data = await assertJsonResponse(page2Response, 200);
            expect(page2Data.items).toHaveLength(10);
            expect(page2Data.currentPage).toBe(2);

            const page3Response = await makeAuthenticatedRequest(
                'http://example.com/vocab?page=3&pageSize=10', user.token
            );

            const page3Data = await assertJsonResponse(page3Response, 200);
            expect(page3Data.items).toHaveLength(5); // Remaining words
            expect(page3Data.currentPage).toBe(3);

            // Test search functionality
            const searchResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab?q=word01', user.token
            );

            const searchData = await assertJsonResponse(searchResponse, 200);
            expect(searchData.items).toHaveLength(1);
            expect(searchData.items[0].word).toBe('word01');

            // Test search with multiple results
            const multiSearchResponse = await makeAuthenticatedRequest(
                'http://example.com/vocab?q=word1', user.token
            );

            const multiSearchData = await assertJsonResponse(multiSearchResponse, 200);
            // Should find word10-word19 (10 words)
            expect(multiSearchData.items.length).toBeGreaterThan(5);
            expect(multiSearchData.items.every(item => item.word.includes('word1'))).toBe(true);
        });
    });

    describe('Profile Management', () => {
        it('should handle profile operations correctly', async () => {
            const user = await createTestUser('testuser', 'testpass');

            // 1. Fetch initial profile
            const profileResponse = await makeAuthenticatedRequest(
                'http://example.com/profile', user.token
            );

            const profileData = await assertJsonResponse(profileResponse, 200);
            expect(profileData.id).toBe(user.id);
            expect(profileData.username).toBe('testuser');
            expect(profileData.custom_instructions).toBeNull();

            // 2. Update profile instructions
            const updateResponse = await makeAuthenticatedRequest(
                'http://example.com/profile', user.token, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_instructions: 'My personal instructions' })
            }
            );

            await assertResponse(updateResponse, 200, 'OK');

            // 3. Verify update
            const updatedProfileResponse = await makeAuthenticatedRequest(
                'http://example.com/profile', user.token
            );

            const updatedProfileData = await assertJsonResponse(updatedProfileResponse, 200);
            expect(updatedProfileData.custom_instructions).toBe('My personal instructions');

            // Verify in database
            await DatabaseValidator.assertUserInstructions(user.id, 'My personal instructions');
        });
    });
});
