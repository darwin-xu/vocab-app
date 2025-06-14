# JSON to Markdown Conversion for OpenAI Responses

## Overview

This document describes the implementation of JSON to Markdown conversion for OpenAI API responses in the vocabulary app.

## Problem

The OpenAI API was returning structured JSON data based on the English dictionary schema, but the client hover window was not displaying it in a formatted way. The raw JSON text was being displayed instead of properly formatted dictionary information.

## Solution

### 1. **Hover Window Rendering**
- Location: `client/src/app.tsx` (lines 805-817)
- The hover window already supports Markdown rendering using the `marked` library
- Uses `dangerouslySetInnerHTML={{ __html: marked(hover.content) }}` to convert Markdown to HTML

### 2. **Server-Side Conversion**
- Added `src/utils/jsonToMarkdown.ts` - utility function to convert dictionary JSON to Markdown
- Modified `src/index.ts` to parse OpenAI JSON responses and convert them to Markdown format
- Installed `json2md` package for future extensibility (though we use a custom function for dictionary-specific formatting)

### 3. **Dictionary Schema**
The OpenAI API returns JSON data structured according to `src/schemas/english_dictionary.schema.json`:

```json
{
    "word": "string",
    "phonetic_symbol": "string",
    "meanings": [
        {
            "part_of_speech": "string",
            "definition": "string", 
            "examples": ["string"]
        }
    ],
    "synonyms": ["string"]
}
```

### 4. **Markdown Output Format**
The conversion produces Markdown in this format:

```markdown
# word
**Pronunciation:** /pronunciation/

## Part of Speech
**Definition:** definition text

**Examples:**
- example sentence 1
- example sentence 2

## Synonyms
- synonym 1
- synonym 2
```

## Implementation Details

### Key Files Modified:
1. `src/index.ts` - Added JSON parsing and Markdown conversion in OpenAI endpoint
2. `src/utils/jsonToMarkdown.ts` - New utility function for conversion
3. `test/jsonToMarkdown.spec.ts` - Tests for the conversion functionality
4. `package.json` - Added `json2md` dependency

### Error Handling
- If JSON parsing fails, the system falls back to returning the original content
- Graceful handling of empty or malformed data

## Testing

- All existing tests continue to pass
- Added comprehensive tests for the JSON to Markdown conversion
- Tests cover both normal cases and edge cases (empty arrays, missing data)

## Benefits

1. **Better User Experience**: Dictionary definitions now display in a clean, formatted way
2. **Structured Information**: Clear separation of parts of speech, definitions, examples, and synonyms
3. **Backwards Compatible**: Falls back to original content if JSON parsing fails
4. **Extensible**: Can easily add more formatting for other types of OpenAI responses
