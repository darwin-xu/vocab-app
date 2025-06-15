interface DictionaryEntry {
    word: string;
    phonetic_symbol: string;
    meanings: Array<{
        part_of_speech: string;
        definition: string;
        examples: string[];
    }>;
    synonyms: string[];
}

export function convertDictionaryToMarkdown(data: DictionaryEntry): string {
    const { word, phonetic_symbol, meanings, synonyms } = data;

    let markdown = '';

    // Word and phonetic symbol
    markdown += `# ${word}\n`;
    if (phonetic_symbol) {
        markdown += `**Pronunciation:** ${phonetic_symbol}\n\n`;
    }

    // Meanings
    if (meanings && meanings.length > 0) {
        meanings.forEach((meaning) => {
            // Part of speech as a subheading
            markdown += `## ${meaning.part_of_speech.charAt(0).toUpperCase() + meaning.part_of_speech.slice(1)}\n`;

            // Definition
            markdown += `**Definition:** ${meaning.definition}\n\n`;

            // Examples
            if (meaning.examples && meaning.examples.length > 0) {
                markdown += `**Examples:**\n`;
                meaning.examples.forEach((example) => {
                    markdown += `- ${example}\n`;
                });
                markdown += '\n';
            }
        });
    }

    // Synonyms
    if (synonyms && synonyms.length > 0) {
        markdown += `## Synonyms\n`;
        markdown += synonyms.map((synonym) => `- ${synonym}`).join('\n');
        markdown += '\n\n';
    }

    return markdown.trim();
}
