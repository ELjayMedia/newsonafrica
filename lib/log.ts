export interface LogMeta {
  [key: string]: unknown;
}

/**
 * Serialize values that JSON.stringify would otherwise drop — notably Error
 * objects, whose enumerable properties are empty. Called recursively so
 * errors nested inside meta objects (common in `safe-action`'s fail log)
 * still surface their name/message/stack in production logs.
 */
function serializeMeta(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...((value as { code?: unknown }).code !== undefined
        ? { code: (value as { code?: unknown }).code }
        : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeMeta(item, seen));
  }
  if (value && typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeMeta(inner, seen);
    }
    return out;
  }
  return value;
}

function emit(level: 'info' | 'warn' | 'error', message: string, meta: LogMeta): void {
  const payload: Record<string, unknown> = { level, message };
  for (const [key, value] of Object.entries(meta)) {
    payload[key] = serializeMeta(value);
  }
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function info(message: string, meta: LogMeta = {}): void {
  emit('info', message, meta);
}

export function warn(message: string, meta: LogMeta = {}): void {
  emit('warn', message, meta);
}

export function error(message: string, meta: LogMeta = {}): void {
  emit('error', message, meta);
}
