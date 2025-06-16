# OpenAI & TTS Request Caching Implementation

## Overview

This implementation adds browser-side caching for both OpenAI API requests and TTS (Text-to-Speech) requests with a 5-minute timeout to reduce costs and improve user experience.

## Features

- **5-minute cache timeout**: Responses are cached for 5 minutes to balance freshness with performance
- **Case-insensitive matching**: "Hello", "hello", and "HELLO" use the same cache entry
- **Action-specific caching**: Different OpenAI actions (define, example, synonym) are cached separately
- **TTS text caching**: Audio responses for identical text are cached
- **Automatic cleanup**: Expired entries are removed every 10 minutes
- **User-specific caching**: Cache is cleared when user logs out
- **Memory-based**: No persistent storage, fresh start on page reload

## Cache Behavior

### Cache Keys

**OpenAI Cache Keys:**
- Format: `${word.toLowerCase()}-${action}`
- Examples: `hello-define`, `hello-example`, `world-define`

**TTS Cache Keys:**
- Format: `tts-${text.toLowerCase()}`
- Examples: `tts-hello world`, `tts-how are you today`

### Cache Lifecycle

1. **First Request**: Cache miss → API call → Response cached
2. **Subsequent Requests**: Cache hit → Instant response (within 5 minutes)
3. **After 5 minutes**: Cache expiration → API call → Response re-cached
4. **On Logout**: All cache entries cleared

### Example Usage Flow

**OpenAI Caching:**
```javascript
// First call - API request made
const result1 = await openaiCall('hello', 'define');
// Console: "🌐 Cache miss for "hello" (define) - fetching from API"
// Console: "💾 Cached response for "hello" (define)"

// Second call - served from cache
const result2 = await openaiCall('hello', 'define');
// Console: "🎯 Cache hit for "hello" (define)"

// Different action - new API request
const result3 = await openaiCall('hello', 'example');
// Console: "🌐 Cache miss for "hello" (example) - fetching from API"

// Case insensitive - served from cache
const result4 = await openaiCall('HELLO', 'define');
// Console: "🎯 Cache hit for "hello" (define)"
```

**TTS Caching:**
```javascript
// First call - API request made
const audio1 = await ttsCall('hello world');
// Console: "🌐 TTS Cache miss for "hello world" - fetching from API"
// Console: "💾 Cached TTS response for "hello world""

// Second call - served from cache
const audio2 = await ttsCall('hello world');
// Console: "🎯 TTS Cache hit for "hello world""

// Case insensitive - served from cache
const audio3 = await ttsCall('HELLO WORLD');
// Console: "🎯 TTS Cache hit for "hello world""
```

## Benefits

- **⚡ Faster Responses**: Cached responses are instant
- **💰 Cost Reduction**: Fewer OpenAI API calls and TTS requests
- **🚀 Better UX**: No loading time for repeated requests
- **🧹 Automatic Cleanup**: No manual cache management needed
- **🔄 Fresh Content**: 5-minute expiration ensures reasonably fresh responses
- **🎵 Audio Efficiency**: TTS audio cached for repeated text-to-speech requests

## Implementation Details

### Files Modified

- `client/src/api.ts`: Added `OpenAICache` class, integrated with `openaiCall()` and `ttsCall()`
- `client/src/test/openai-cache.test.ts`: OpenAI caching test suite
- `client/src/test/tts-cache.test.ts`: TTS caching test suite

### Cache Class

```typescript
class OpenAICache {
    private cache = new Map<string, CacheEntry>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // OpenAI methods
    get(word: string, action: string): string | null
    set(word: string, action: string, data: string): void
    
    // TTS methods
    getTTS(text: string): string | null
    setTTS(text: string, data: string): void
    
    // Shared methods
    clear(): void
    cleanup(): void
    getStats(): CacheStats
}
```

### Error Handling

- Failed API calls are **not cached**
- Cache failures fall back to API calls
- Invalid cache entries are automatically removed

## Testing

The implementation includes comprehensive tests covering:

**OpenAI Cache Tests:**
- Basic caching functionality
- Cache expiration after 5 minutes
- Case-insensitive word matching
- Different word/action combinations
- Error response handling
- Cache clearing on logout

**TTS Cache Tests:**
- Basic TTS caching functionality
- Cache expiration after 5 minutes
- Case-insensitive text matching
- Different text combinations
- Error response handling
- Cache clearing on logout
- Independence from OpenAI cache

Run tests:
```bash
cd client && npm test openai-cache.test.ts tts-cache.test.ts
```

## Debugging

During development, the console will show cache activity:

**OpenAI Cache:**
- `🌐 Cache miss` - API call made
- `🎯 Cache hit` - Served from cache
- `💾 Cached response` - Response stored in cache

**TTS Cache:**
- `🌐 TTS Cache miss` - TTS API call made
- `🎯 TTS Cache hit` - Audio served from cache
- `💾 Cached TTS response` - Audio stored in cache

Get cache statistics in browser console:
```javascript
import { _getCacheStats } from './api';
console.log(_getCacheStats()); // { totalEntries: 5, validEntries: 4, expiredEntries: 1 }
```

## Future Enhancements

Potential improvements for future versions:
- Persistent storage (localStorage/IndexedDB) for cross-session caching
- Configurable cache duration per user or content type
- Cache warming for common words and phrases
- Compression for large TTS audio responses
- Cache hit/miss metrics tracking
- Different TTL for different content types (e.g., longer for audio)
