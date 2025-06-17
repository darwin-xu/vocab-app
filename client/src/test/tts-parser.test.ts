import { describe, it, expect } from 'vitest';
import {
    parseMarkdownForTTS,
    cleanTextForTTS,
    getSectionsByType,
    type TTSSection,
} from '../utils/ttsParser';

describe('TTS Parser Utilities', () => {
    const sampleMarkdown = `# example

**Pronunciation:** /ɪɡˈzæmpəl/

## Noun

**Definition:** A thing characteristic of its kind or illustrating a general rule.

**Examples:**
- This is a good example of his work.
- She gave an example to illustrate her point.

## Verb

**Definition:** To be illustrated or exemplified.

**Examples:**
- These cases example the complexity of the issue.

## Synonyms

- instance
- illustration
- case`;

    describe('parseMarkdownForTTS', () => {
        it('should parse markdown content into TTS sections', () => {
            const sections = parseMarkdownForTTS(sampleMarkdown);

            expect(sections).toHaveLength(6); // pronunciation, 2 definitions, 2 examples, 1 synonyms

            // Check pronunciation
            const pronunciations = getSectionsByType(sections, 'pronunciation');
            expect(pronunciations).toHaveLength(1);
            expect(pronunciations[0].content).toBe('/ɪɡˈzæmpəl/');

            // Check definitions
            const definitions = getSectionsByType(sections, 'definition');
            expect(definitions).toHaveLength(2);
            expect(definitions[0].partOfSpeech).toBe('Noun');
            expect(definitions[1].partOfSpeech).toBe('Verb');

            // Check examples
            const examples = getSectionsByType(sections, 'examples');
            expect(examples).toHaveLength(2);
            expect(examples[0].content).toContain(
                'This is a good example of his work',
            );

            // Check synonyms
            const synonyms = getSectionsByType(sections, 'synonyms');
            expect(synonyms).toHaveLength(1);
            expect(synonyms[0].content).toBe(
                'Synonyms: instance, illustration, case',
            );
        });

        it('should handle empty markdown gracefully', () => {
            const sections = parseMarkdownForTTS('');
            expect(sections).toHaveLength(0);
        });

        it('should handle markdown without standard sections', () => {
            const simpleMarkdown = '# word\n\nSome random content.';
            const sections = parseMarkdownForTTS(simpleMarkdown);
            expect(sections).toHaveLength(0);
        });
    });

    describe('cleanTextForTTS', () => {
        it('should remove markdown formatting', () => {
            const dirtyText = '**Bold text** and *italic text* with # headers';
            const cleanText = cleanTextForTTS(dirtyText);
            expect(cleanText).toBe('Bold text and italic text with headers');
        });

        it('should remove bullet points', () => {
            const bulletText = '- First item\n- Second item';
            const cleanText = cleanTextForTTS(bulletText);
            expect(cleanText).toBe('First item\nSecond item');
        });

        it('should handle empty text', () => {
            const cleanText = cleanTextForTTS('');
            expect(cleanText).toBe('');
        });
    });

    describe('getSectionsByType', () => {
        it('should filter sections by type correctly', () => {
            const sections = parseMarkdownForTTS(sampleMarkdown);

            const definitions = getSectionsByType(sections, 'definition');
            expect(
                definitions.every(
                    (section: TTSSection) => section.type === 'definition',
                ),
            ).toBe(true);

            const examples = getSectionsByType(sections, 'examples');
            expect(
                examples.every(
                    (section: TTSSection) => section.type === 'examples',
                ),
            ).toBe(true);

            const nonExistent = getSectionsByType(sections, 'pronunciation');
            expect(nonExistent).toHaveLength(1);
        });
    });
});
