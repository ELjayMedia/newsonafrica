import debug from 'debug';

const isDevelopment = process.env.NODE_ENV !== 'production';

export function createLogger(namespace: string) {
  const debugLogger = debug(`newsonafrica:${namespace}`);
  const warnLogger = debug(`newsonafrica:${namespace}:warn`);

  return {
    debug: (...args: unknown[]) => {
      if (isDevelopment) {
        debugLogger(...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (isDevelopment) {
        warnLogger(...args);
      }
    },
  } as const;
}

export default createLogger;
