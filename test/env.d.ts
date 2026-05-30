declare module 'cloudflare:test' {
    interface ProvidedEnv extends Env {
        DB: D1Database;
        ASSETS: { fetch: (request: Request) => Promise<Response> };
        OPENROUTER_API_KEY: string;
        OPENROUTER_BASE_URL?: string;
        OPENROUTER_MODEL?: string;
        OPENROUTER_TTS_MODEL?: string;
        OPENROUTER_SITE_URL?: string;
        OPENROUTER_APP_TITLE?: string;
        ENVIRONMENT?: string;
    }
}
