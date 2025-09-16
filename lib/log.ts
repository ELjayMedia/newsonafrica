export interface LogMeta {
  [key: string]: unknown;
}

export function info(message: string, meta: LogMeta = {}): void {
  console.info(JSON.stringify({ level: 'info', message, ...meta }));
}

export function warn(message: string, meta: LogMeta = {}): void {
  console.warn(JSON.stringify({ level: 'warn', message, ...meta }));
}

export function error(message: string, meta: LogMeta = {}): void {
  console.error(JSON.stringify({ level: 'error', message, ...meta }));
}
