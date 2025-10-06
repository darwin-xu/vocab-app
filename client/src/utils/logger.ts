const isTestMode = import.meta.env.MODE === 'test';
const isVerboseFrontend = import.meta.env.VITE_VERBOSE_FRONTEND === 'true';

const shouldEmitLogs = !isTestMode || isVerboseFrontend;

type LogMethod = (...args: unknown[]) => void;

const guard = (logger: (...args: unknown[]) => void): LogMethod => {
    return (...args: unknown[]) => {
        if (shouldEmitLogs) {
            logger(...args);
        }
    };
};

export const debugLog: LogMethod = guard(console.log);
export const warnLog: LogMethod = guard(console.warn);
export const errorLog: LogMethod = guard(console.error);
