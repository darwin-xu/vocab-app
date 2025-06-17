// Utility functions for parsing Markdown content for granular TTS

export interface TTSSection {
    type: 'definition' | 'examples' | 'synonyms' | 'pronunciation';
    content: string;
    partOfSpeech?: string;
}

export function parseMarkdownForTTS(markdown: string): TTSSection[] {
    const sections: TTSSection[] = [];
    const lines = markdown.split('\n');

    let currentPartOfSpeech = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Check for pronunciation
        if (line.startsWith('**Pronunciation:**')) {
            const pronunciation = line.replace('**Pronunciation:**', '').trim();
            sections.push({
                type: 'pronunciation',
                content: pronunciation,
            });
            continue;
        }

        // Check for part of speech headers (## Noun, ## Verb, etc.)
        if (line.startsWith('## ') && !line.includes('Synonyms')) {
            currentPartOfSpeech = line.replace('## ', '').trim();
            continue;
        }

        // Check for definition
        if (line.startsWith('**Definition:**')) {
            const definition = line.replace('**Definition:**', '').trim();
            sections.push({
                type: 'definition',
                content: definition,
                partOfSpeech: currentPartOfSpeech,
            });
            continue;
        }

        // Check for examples section
        if (line.startsWith('**Examples:**')) {
            // Collect all example lines that follow
            const examples: string[] = [];
            let j = i + 1;
            while (j < lines.length && lines[j].trim().startsWith('- ')) {
                examples.push(lines[j].trim().replace('- ', ''));
                j++;
            }

            if (examples.length > 0) {
                sections.push({
                    type: 'examples',
                    content: examples.join('. '),
                    partOfSpeech: currentPartOfSpeech,
                });
            }

            i = j - 1; // Skip the processed lines
            continue;
        }

        // Check for synonyms section
        if (line.startsWith('## Synonyms')) {
            // Collect all synonym lines that follow
            const synonyms: string[] = [];
            let j = i + 1;
            while (j < lines.length) {
                const nextLine = lines[j].trim();
                if (nextLine.startsWith('- ')) {
                    synonyms.push(nextLine.replace('- ', ''));
                    j++;
                } else if (nextLine === '') {
                    // Skip empty lines
                    j++;
                } else {
                    // Stop if we hit a non-synonym line
                    break;
                }
            }

            if (synonyms.length > 0) {
                sections.push({
                    type: 'synonyms',
                    content: `Synonyms: ${synonyms.join(', ')}`,
                });
            }

            i = j - 1; // Skip the processed lines
            continue;
        }
    }

    return sections;
}

export function cleanTextForTTS(text: string): string {
    // Remove markdown formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
        .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
        .replace(/#{1,6}\s*/g, '') // Remove headers
        .replace(/- /g, '') // Remove bullet points
        .trim();
}

export function getSectionsByType(
    sections: TTSSection[],
    type: TTSSection['type'],
): TTSSection[] {
    return sections.filter((section) => section.type === type);
}
