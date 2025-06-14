import { convertDictionaryToMarkdown } from '../src/utils/jsonToMarkdown.js';
import json2md from 'json2md';
import { describe, it, expect } from 'vitest';

describe('json2md vs custom converter comparison', () => {
    const sampleData = {
        word: 'example',
        phonetic_symbol: '/ɪɡˈzæmpəl/',
        meanings: [
            {
                part_of_speech: 'noun',
                definition: 'A thing characteristic of its kind or illustrating a general rule.',
                examples: [
                    'This is a good example of his work.',
                    'She gave an example to illustrate her point.'
                ]
            },
            {
                part_of_speech: 'verb',
                definition: 'To be illustrated or exemplified.',
                examples: [
                    'These cases example the complexity of the issue.'
                ]
            }
        ],
        synonyms: ['instance', 'illustration', 'case']
    };

    it('should show what json2md produces (generic conversion)', () => {
        // json2md expects a specific array format, so we need to restructure our data
        const json2mdData = [
            { h1: sampleData.word },
            { p: `**Pronunciation:** ${sampleData.phonetic_symbol}` },
            { h2: 'Meanings' },
            ...sampleData.meanings.map(meaning => [
                { h3: meaning.part_of_speech },
                { p: `**Definition:** ${meaning.definition}` },
                { ul: meaning.examples }
            ]).flat(),
            { h2: 'Synonyms' },
            { ul: sampleData.synonyms }
        ];

        const json2mdResult = json2md(json2mdData);
        console.log('json2md result:');
        console.log(json2mdResult);
        
        expect(json2mdResult).toContain('# example');
    });

    it('should show what our custom converter produces (dictionary-specific)', () => {
        const customResult = convertDictionaryToMarkdown(sampleData);
        console.log('Custom converter result:');
        console.log(customResult);
        
        expect(customResult).toContain('# example');
        expect(customResult).toContain('## Noun');
        expect(customResult).toContain('## Verb');
    });

    it('should compare the raw JSON conversion vs custom formatting', () => {
        // What json2md would produce if we just passed the raw JSON
        const rawJson2mdResult = json2md([
            { p: JSON.stringify(sampleData, null, 2) }
        ]);
        
        console.log('Raw JSON with json2md:');
        console.log(rawJson2mdResult);
        
        const customResult = convertDictionaryToMarkdown(sampleData);
        
        // Our custom function should be much more readable
        expect(customResult.length).toBeGreaterThan(0);
        expect(rawJson2mdResult).toContain('"word": "example"');
    });
});
