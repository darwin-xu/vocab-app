interface DictionaryEntry {
    word: string;
    phonetic_symbol: string;
    meanings: Array<{
        part_of_speech: string;
        definition: string;
        examples: string[];
    }>;
    synonyms: string[];
    visual_reference?: {
        is_object_noun: boolean;
        image_query: string;
    };
}

const KNOWN_OBJECT_NOUN_IMAGE_QUERIES: Record<string, string> = {
    airplane: 'passenger airplane',
    aeroplane: 'passenger airplane',
    plane: 'passenger airplane',
    bicycle: 'bicycle',
    bike: 'bicycle',
    camera: 'camera',
    car: 'car',
    chair: 'chair',
    cup: 'cup',
    mug: 'mug',
    book: 'book',
    table: 'table',
    phone: 'smartphone',
    computer: 'computer',
    laptop: 'laptop',
    bottle: 'bottle',
    apple: 'apple fruit',
};

function hasNounMeaning(data: DictionaryEntry): boolean {
    return data.meanings.some((meaning) => meaning.part_of_speech === 'noun');
}

function getVisualReference(data: DictionaryEntry): {
    word: string;
    image_query: string;
} | null {
    if (
        data.visual_reference?.is_object_noun &&
        data.visual_reference.image_query.trim()
    ) {
        return {
            word: data.word,
            image_query: data.visual_reference.image_query.trim(),
        };
    }

    const knownImageQuery =
        KNOWN_OBJECT_NOUN_IMAGE_QUERIES[data.word.trim().toLowerCase()];
    if (knownImageQuery && hasNounMeaning(data)) {
        return {
            word: data.word,
            image_query: knownImageQuery,
        };
    }

    return null;
}

export function convertDictionaryToMarkdown(data: DictionaryEntry): string {
    const { word, phonetic_symbol, meanings, synonyms } = data;

    let markdown = '';

    // Word and phonetic symbol
    markdown += `# ${word}\n`;
    if (phonetic_symbol) {
        markdown += `**Pronunciation:** ${phonetic_symbol}\n\n`;
    }

    const visualReference = getVisualReference(data);
    if (visualReference) {
        markdown += `<!-- vocab-image:${JSON.stringify(visualReference)} -->\n\n`;
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
