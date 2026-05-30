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

function escapeSvgText(text: string): string {
    return text.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&apos;',
        };
        return entities[character];
    });
}

function getObjectDrawing(query: string): string {
    const normalizedQuery = query.toLowerCase();

    if (normalizedQuery.includes('apple')) {
        return `
            <circle cx="315" cy="190" r="78" fill="#ff4f6d" stroke="#b91c1c" stroke-width="10"/>
            <path d="M315 102 C308 72 334 48 365 57" fill="none" stroke="#654321" stroke-width="14" stroke-linecap="round"/>
            <ellipse cx="358" cy="88" rx="34" ry="18" fill="#6ee75a" transform="rotate(-28 358 88)"/>
            <circle cx="285" cy="164" r="20" fill="#fff2f2" opacity=".75"/>
        `;
    }

    if (normalizedQuery.includes('chair')) {
        return `
            <rect x="235" y="120" width="170" height="116" rx="24" fill="#4f9cff" stroke="#155eaa" stroke-width="10"/>
            <rect x="220" y="215" width="200" height="52" rx="20" fill="#ffd43b" stroke="#b7791f" stroke-width="10"/>
            <line x1="252" y1="267" x2="232" y2="320" stroke="#155eaa" stroke-width="14" stroke-linecap="round"/>
            <line x1="388" y1="267" x2="408" y2="320" stroke="#155eaa" stroke-width="14" stroke-linecap="round"/>
        `;
    }

    if (normalizedQuery.includes('book')) {
        return `
            <path d="M170 105 H312 C340 105 358 124 358 152 V292 H216 C190 292 170 272 170 246 Z" fill="#ff6b6b" stroke="#a61e4d" stroke-width="10"/>
            <path d="M358 152 C358 124 376 105 404 105 H470 V292 H358 Z" fill="#4dabf7" stroke="#1864ab" stroke-width="10"/>
            <line x1="358" y1="126" x2="358" y2="292" stroke="#ffffff" stroke-width="8"/>
            <line x1="212" y1="152" x2="300" y2="152" stroke="#fff5f5" stroke-width="8" stroke-linecap="round"/>
        `;
    }

    if (normalizedQuery.includes('camera')) {
        return `
            <rect x="180" y="130" width="280" height="170" rx="34" fill="#7c3aed" stroke="#3b0764" stroke-width="10"/>
            <rect x="220" y="100" width="90" height="48" rx="16" fill="#f97316" stroke="#9a3412" stroke-width="8"/>
            <circle cx="320" cy="215" r="58" fill="#22d3ee" stroke="#083344" stroke-width="12"/>
            <circle cx="320" cy="215" r="28" fill="#ecfeff"/>
            <circle cx="424" cy="165" r="16" fill="#fef08a"/>
        `;
    }

    if (normalizedQuery.includes('car')) {
        return `
            <path d="M155 224 L205 156 H407 L475 224 Z" fill="#38d9a9" stroke="#087f5b" stroke-width="10" stroke-linejoin="round"/>
            <rect x="132" y="216" width="376" height="70" rx="28" fill="#ff922b" stroke="#9a3412" stroke-width="10"/>
            <circle cx="220" cy="296" r="34" fill="#1f2937"/>
            <circle cx="420" cy="296" r="34" fill="#1f2937"/>
            <rect x="245" y="170" width="112" height="42" rx="12" fill="#e0f2fe"/>
        `;
    }

    if (normalizedQuery.includes('cup') || normalizedQuery.includes('mug')) {
        return `
            <path d="M225 130 H390 L365 300 H250 Z" fill="#facc15" stroke="#a16207" stroke-width="10" stroke-linejoin="round"/>
            <path d="M388 170 H430 C462 170 462 236 424 238 H378" fill="none" stroke="#a16207" stroke-width="14" stroke-linecap="round"/>
            <ellipse cx="308" cy="130" rx="84" ry="24" fill="#fff7ad" stroke="#a16207" stroke-width="8"/>
        `;
    }

    return `
        <rect x="210" y="116" width="220" height="180" rx="42" fill="#22c55e" stroke="#166534" stroke-width="10"/>
        <circle cx="255" cy="160" r="28" fill="#fef08a"/>
        <path d="M250 250 C290 200 340 205 390 250" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
        <rect x="270" y="176" width="100" height="54" rx="18" fill="#60a5fa" stroke="#1d4ed8" stroke-width="8"/>
    `;
}

function getObjectImageUrl(query: string): string {
    const label = escapeSvgText(query.trim().toLowerCase());
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${label}">
            <rect width="640" height="360" rx="32" fill="#fff7ed"/>
            <circle cx="116" cy="78" r="54" fill="#fde047"/>
            <circle cx="540" cy="86" r="38" fill="#a78bfa"/>
            <circle cx="95" cy="287" r="44" fill="#67e8f9"/>
            <circle cx="535" cy="286" r="58" fill="#f9a8d4"/>
            <ellipse cx="320" cy="314" rx="190" ry="22" fill="#fdba74" opacity=".45"/>
            ${getObjectDrawing(query)}
            <text x="320" y="344" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#1f2937">${label}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function convertDictionaryToMarkdown(data: DictionaryEntry): string {
    const { word, phonetic_symbol, meanings, synonyms, visual_reference } =
        data;

    let markdown = '';

    // Word and phonetic symbol
    markdown += `# ${word}\n`;
    if (phonetic_symbol) {
        markdown += `**Pronunciation:** ${phonetic_symbol}\n\n`;
    }

    if (
        visual_reference?.is_object_noun &&
        visual_reference.image_query.trim()
    ) {
        const imageUrl = getObjectImageUrl(visual_reference.image_query);
        markdown += `![Visual: ${word}](${imageUrl})\n\n`;
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
