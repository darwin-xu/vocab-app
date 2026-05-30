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

declare const __APP_VERSION_DATE__: string;
declare const __APP_BUILD_NUMBER__: string;
declare const __APP_DEPLOY_DATE__: string;
