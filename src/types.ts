export interface Env {
    DB: D1Database;
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    OPENAI_TOKEN: string;
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

export interface OpenAIResponse {
    output?: {
        content?: {
            text?: string;
        }[];
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
