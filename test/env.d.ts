declare module 'cloudflare:test' {
    interface ProvidedEnv extends Env {
        DB: D1Database;
        ASSETS: { fetch: (request: Request) => Promise<Response> };
        OPENAI_TOKEN: string;
        ENVIRONMENT?: string;
    }
}
