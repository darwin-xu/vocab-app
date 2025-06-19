/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly NODE_ENV: string;
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: string;
    }
}

declare const process: {
    env: NodeJS.ProcessEnv;
};

declare const global: typeof globalThis;
