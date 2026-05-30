export interface Env {
    DB: D1Database;
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    OPENROUTER_API_KEY: string;
    OPENROUTER_BASE_URL?: string;
    OPENROUTER_MODEL?: string;
    OPENROUTER_IMAGE_MODEL?: string;
    OPENROUTER_TTS_MODEL?: string;
    OPENROUTER_SITE_URL?: string;
    OPENROUTER_APP_TITLE?: string;
    ENVIRONMENT?: string;
}

export interface UserRow {
    id: number;
    username: string;
    password: string;
    is_admin: boolean;
    custom_instructions?: string | null;
    created_at?: string;
}

export interface VocabCountResult {
    count: number;
}

export interface Message {
    role: string;
    content: string;
}

export interface OpenRouterChatResponse {
    choices?: {
        message?: {
            content?: string;
        };
    }[];
}

export interface OpenRouterImageResponse {
    choices?: {
        message?: {
            images?: {
                image_url?: {
                    url?: string;
                };
                imageUrl?: {
                    url?: string;
                };
            }[];
        };
    }[];
}

export interface RegisterRequestBody {
    username: string;
    password: string;
}

export interface LoginRequestBody {
    username: string;
    password: string;
}

export interface VocabRequestBody {
    word: string;
}

export interface DeleteVocabRequestBody {
    words: string[];
}

export interface UpdateUserRequestBody {
    custom_instructions?: string | null;
}

export interface NoteRequestBody {
    word: string;
    note: string;
}

export interface DeleteNoteRequestBody {
    word: string;
}

export interface QueryHistoryRequestBody {
    word: string;
    query_type: 'definition' | 'tts';
}

export interface WordImageRequestBody {
    word: string;
    image_query: string;
    regenerate?: boolean;
}

export interface WordImageRow {
    word: string;
    image_query: string;
    image_data: string;
    mime_type: string;
    model: string;
    prompt: string;
    created_at: string;
    updated_at: string;
}

export interface QueryHistoryRow {
    id: number;
    user_id: number;
    word: string;
    query_type: string;
    query_time: string;
}
