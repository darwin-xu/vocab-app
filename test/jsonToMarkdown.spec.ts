import { convertDictionaryToMarkdown } from '../src/utils/jsonToMarkdown.js';
import { describe, it, expect } from 'vitest';

describe('JSON to Markdown conversion', () => {
    it('should convert dictionary JSON to markdown format', () => {
        const sampleData = {
            word: 'example',
            phonetic_symbol: '/ɪɡˈzæmpəl/',
            meanings: [
                {
                    part_of_speech: 'noun',
                    definition:
                        'A thing characteristic of its kind or illustrating a general rule.',
                    examples: [
                        'This is a good example of his work.',
                        'She gave an example to illustrate her point.',
                    ],
                },
                {
                    part_of_speech: 'verb',
                    definition: 'To be illustrated or exemplified.',
                    examples: [
                        'These cases example the complexity of the issue.',
                    ],
                },
            ],
            synonyms: ['instance', 'illustration', 'case'],
        };

        const result = convertDictionaryToMarkdown(sampleData);

        expect(result).toContain('# example');
        expect(result).toContain('**Pronunciation:** /ɪɡˈzæmpəl/');
        expect(result).toContain('## Noun');
        expect(result).toContain('## Verb');
        expect(result).toContain(
            '**Definition:** A thing characteristic of its kind',
        );
        expect(result).toContain('- This is a good example of his work.');
        expect(result).toContain('## Synonyms');
        expect(result).toContain('- instance');
        expect(result).toContain('- illustration');
        expect(result).toContain('- case');
    });

    it('should handle empty arrays gracefully', () => {
        const sampleData = {
            word: 'test',
            phonetic_symbol: '',
            meanings: [],
            synonyms: [],
        };

        const result = convertDictionaryToMarkdown(sampleData);

        expect(result).toContain('# test');
        expect(result).not.toContain('**Pronunciation:**');
        expect(result).not.toContain('## Synonyms');
    });
});
