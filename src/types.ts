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
}

export interface VocabCountResult {
    count: number;
}

export interface Message {
    role: string;
    content: string;
}

export interface OpenAIResponse {
    choices?: { message?: { content?: string } }[];
}
