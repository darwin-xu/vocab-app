import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from '../api'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

let localStorageMock: {
  getItem: ReturnType<typeof vi.fn>
  setItem: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
}

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(globalThis, 'location', {
  value: {
    reload: mockReload
  },
  writable: true
})

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // grab the mock provided in setup file
    localStorageMock = globalThis.localStorage as any
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ token: 'test-token', is_admin: false })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await api.login('testuser', 'testpass')

      expect(mockFetch).toHaveBeenCalledWith('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpass' })
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sessionToken', 'test-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('username', 'testuser')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('isAdmin', 'false')
    })

    it('should handle login error', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('Invalid credentials')
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(api.login('testuser', 'wrongpass')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        ok: true
      }
      mockFetch.mockResolvedValue(mockResponse)

      await api.register('newuser', 'newpass')

      expect(mockFetch).toHaveBeenCalledWith('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser', password: 'newpass' })
      })
    })

    it('should handle registration error', async () => {
      const mockResponse = {
        ok: false,
        text: vi.fn().mockResolvedValue('Username already exists')
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(api.register('existinguser', 'password')).rejects.toThrow('Username already exists')
    })
  })

  describe('fetchVocab', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    it('should fetch vocabulary with default parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ words: ['test'] })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await api.fetchVocab()

      expect(mockFetch).toHaveBeenCalledWith('/vocab?q=&page=1&pageSize=20', {
        headers: expect.any(Headers)
      })
      expect(result).toEqual({ words: ['test'] })
    })

    it('should handle unauthorized error', async () => {
      const mockResponse = {
        status: 401
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(api.fetchVocab()).rejects.toThrow('Unauthorized')
    })
  })

  describe('addWord', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    it('should add word successfully', async () => {
      const mockResponse = {
        ok: true
      }
      mockFetch.mockResolvedValue(mockResponse)

      await api.addWord('testword')

      expect(mockFetch).toHaveBeenCalledWith('/add', {
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ word: 'testword' })
      })
    })
  })

  describe('removeWords', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    it('should remove words successfully', async () => {
      const mockResponse = {
        ok: true
      }
      mockFetch.mockResolvedValue(mockResponse)

      await api.removeWords(['word1', 'word2'])

      expect(mockFetch).toHaveBeenCalledWith('/remove', {
        method: 'POST',
        headers: expect.any(Headers),
        body: JSON.stringify({ words: ['word1', 'word2'] })
      })
    })
  })

  describe('openaiCall', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    it('should make OpenAI call successfully', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('AI response')
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await api.openaiCall('testword', 'define')

      expect(mockFetch).toHaveBeenCalledWith('/openai?word=testword&func=define', {
        headers: expect.any(Headers)
      })
      expect(result).toBe('AI response')
    })
  })

  describe('ttsCall', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    it('should make TTS call successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ audio: 'base64audio' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await api.ttsCall('hello')

      expect(mockFetch).toHaveBeenCalledWith('/tts?text=hello', {
        headers: expect.any(Headers)
      })
      expect(result).toBe('base64audio')
    })
  })

  describe('admin functions', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    describe('fetchUsers', () => {
      it('should fetch users successfully', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ users: [] })
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await api.fetchUsers()

        expect(mockFetch).toHaveBeenCalledWith('/admin/users', {
          headers: expect.any(Headers)
        })
        expect(result).toEqual({ users: [] })
      })
    })

    describe('fetchUserDetails', () => {
      it('should fetch user details successfully', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ user: { id: '123' } })
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await api.fetchUserDetails('123')

        expect(mockFetch).toHaveBeenCalledWith('/admin/users/123', {
          headers: expect.any(Headers)
        })
        expect(result).toEqual({ user: { id: '123' } })
      })
    })

    describe('updateUserInstructions', () => {
      it('should update user instructions successfully', async () => {
        const mockResponse = {
          ok: true
        }
        mockFetch.mockResolvedValue(mockResponse)

        await api.updateUserInstructions('123', 'new instructions')

        expect(mockFetch).toHaveBeenCalledWith('/admin/users/123', {
          method: 'PUT',
          headers: expect.any(Headers),
          body: JSON.stringify({ custom_instructions: 'new instructions' })
        })
      })
    })
  })

  describe('profile functions', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('test-token')
    })

    describe('fetchOwnProfile', () => {
      it('should fetch own profile successfully', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({ profile: {} })
        }
        mockFetch.mockResolvedValue(mockResponse)

        const result = await api.fetchOwnProfile()

        expect(mockFetch).toHaveBeenCalledWith('/profile', {
          headers: expect.any(Headers)
        })
        expect(result).toEqual({ profile: {} })
      })
    })

    describe('updateOwnProfile', () => {
      it('should update own profile successfully', async () => {
        const mockResponse = {
          ok: true
        }
        mockFetch.mockResolvedValue(mockResponse)

        await api.updateOwnProfile('updated instructions')

        expect(mockFetch).toHaveBeenCalledWith('/profile', {
          method: 'PUT',
          headers: expect.any(Headers),
          body: JSON.stringify({ custom_instructions: 'updated instructions' })
        })
      })
    })
  })

  describe('utility functions', () => {
    describe('isAdmin', () => {
      it('should return true when user is admin', () => {
        localStorageMock.getItem.mockReturnValue('true')
        expect(api.isAdmin()).toBe(true)
      })

      it('should return false when user is not admin', () => {
        localStorageMock.getItem.mockReturnValue('false')
        expect(api.isAdmin()).toBe(false)
      })

      it('should return false when admin status is not set', () => {
        localStorageMock.getItem.mockReturnValue(null)
        expect(api.isAdmin()).toBe(false)
      })
    })

    describe('logout', () => {
      it('should clear tokens and reload the page', () => {
        api.logout()

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('sessionToken')
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('username')
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('isAdmin')
        expect(mockReload).toHaveBeenCalled()
      })
    })
  })
})
