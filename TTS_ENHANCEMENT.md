# Granular Text-to-Speech (TTS) Enhancement

## Overview

This enhancement adds granular text-to-speech controls to the hover window, allowing users to listen to specific sections of word definitions instead of the entire content.

## Features

### Section-Based TTS Controls
- **Pronunciation**: Listen to the phonetic pronunciation only
- **Definitions**: Listen to individual definitions by part of speech
- **Examples**: Listen to example sentences by part of speech  
- **Synonyms**: Listen to the list of synonyms
- **Read All**: Listen to the complete content (original behavior)

### User Interface
- Clean, intuitive speaker (🔊) icons next to each section
- Clear labels indicating what each button will read
- Responsive design that works on mobile and desktop
- Visual feedback for better usability

## Implementation Details

### New Files Added

#### 1. `client/src/utils/ttsParser.ts`
- Parses Markdown content to extract different sections
- Provides utility functions for cleaning text for speech synthesis
- Type definitions for TTS sections

#### 2. `client/src/components/TTSControls.tsx`
- React component that renders TTS control buttons
- Handles audio playback and management
- Automatically detects available sections in content

#### 3. `client/src/test/tts-parser.test.ts`
- Comprehensive tests for the TTS parsing functionality
- Validates Markdown parsing accuracy
- Tests text cleaning for speech synthesis

### Modified Files

#### 1. `client/src/app.tsx`
- Updated hover window to use new TTS controls
- Removed old click-to-read-all functionality
- Added TTSControls component integration

#### 2. `client/src/app.css`
- Added comprehensive styling for TTS controls
- Responsive design adjustments
- Enhanced hover window layout

#### 3. `client/src/test/app.test.tsx`
- Updated tests to work with new TTS control buttons
- Fixed test expectations for new interaction pattern

## Technical Architecture

### Content Parsing Flow
```
Markdown Content → parseMarkdownForTTS() → TTSSection[] → Individual Controls
```

### TTS Section Types
```typescript
interface TTSSection {
    type: 'definition' | 'examples' | 'synonyms' | 'pronunciation';
    content: string;
    partOfSpeech?: string;
}
```

### Text Cleaning
- Removes Markdown formatting (`**bold**`, `*italic*`, `# headers`)
- Strips bullet points for natural speech
- Preserves punctuation for proper speech rhythm

## User Experience

### Before
- Click anywhere on hover window → reads entire content
- No granular control
- Raw Markdown text sent to TTS (poor speech quality)

### After
- Dedicated TTS controls section at bottom of hover window
- Individual speaker buttons for each content type
- Clean text optimized for speech synthesis
- Maintains "Read All" option for complete content

## Usage Examples

### Dictionary Entry Display
When viewing a word definition, users now see:

```
🎧 Listen to sections:
Pronunciation: 🔊
Noun Definition: 🔊
Noun Examples: 🔊
Verb Definition: 🔊
Verb Examples: 🔊
Synonyms: 🔊
Read All: 🔊
```

### Mobile Experience
- Responsive button sizing
- Touch-friendly controls
- Reduced padding for smaller screens
- Maintained accessibility

## Testing

### Test Coverage
- **TTS Parser**: 7 comprehensive tests
- **Component Integration**: Updated existing app tests
- **Edge Cases**: Empty content, malformed Markdown, missing sections
- **Text Cleaning**: Markdown removal and formatting

### Test Commands
```bash
# Run TTS-specific tests
npm test -- --run tts-parser.test.ts

# Run all frontend tests
cd client && npm test -- --run

# Build verification
npm run build
```

## Future Enhancements

### Potential Improvements
1. **Keyboard Shortcuts**: Add hotkeys for common TTS actions
2. **Voice Selection**: Allow users to choose different TTS voices
3. **Speed Control**: Adjustable speech rate
4. **Highlighting**: Visual indication of currently speaking text
5. **Audio Controls**: Play/pause/stop buttons for longer content

### Performance Optimizations
1. **Audio Caching**: Cache generated audio for repeated requests
2. **Preloading**: Generate audio for all sections when hover opens
3. **Streaming**: For very long content, implement streaming TTS

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers with Web Audio API support

## Accessibility

- Proper ARIA labels on all TTS buttons
- Keyboard navigation support
- Screen reader compatible
- High contrast speaker icons
- Clear visual hierarchy

---

This enhancement significantly improves the user experience by providing granular control over text-to-speech functionality, making it easier for users to focus on specific aspects of word definitions and improving overall accessibility.
