/**
 * Structured, leveled logging (NOA-118).
 *
 * Adapted from `legacy/lib/log.ts` (recursive Error/circular-safe context
 * serialization) and `legacy/lib/observability/logger.ts` (levels, bound
 * request context) into one small module:
 *
 *  - **Levels**: debug < info < warn < error. The active threshold comes
 *    from `LOG_LEVEL` (`debug|info|warn|error|silent`), defaulting to
 *    `debug` in development and `info` in production.
 *  - **Structured output**: one JSON object per line in production (what
 *    Vercel log drains and `vercel logs` parse best); a human-readable
 *    `LEVEL [scope] message {context}` line in development.
 *  - **Child loggers**: `logger.child({ scope: "content-sync" })` returns a
 *    logger with that context bound to every entry; children nest.
 *    `createLogger("scope")` is shorthand for the common case.
 *  - **Errors**: pass an `Error` (or embed one anywhere in context) and its
 *    name/message/stack/code are serialized instead of the `{}` that
 *    `JSON.stringify` would produce. Circular references become
 *    `"[Circular]"` rather than a throw.
 *
 * Isomorphic on purpose: no `server-only`, no Node-specific imports, so
 * client-safe modules (e.g. `lib/rate-limit.ts`) and client components can
 * share it. The output sink is injectable for tests via `createLogger`.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext | Error): void;
  info(message: string, context?: LogContext | Error): void;
  warn(message: string, context?: LogContext | Error): void;
  error(message: string, context?: LogContext | Error): void;
  /** New logger with `context` merged into every entry it emits. */
  child(context: LogContext): Logger;
}

/** Where finished lines go — console by default, capturable in tests. */
export type LogSink = (level: LogLevel, line: string) => void;

export interface LoggerOptions {
  /** Minimum level to emit. Defaults to LOG_LEVEL env, then NODE_ENV. */
  level?: LogLevel | "silent";
  /** `"json"` (production default) or `"pretty"` (development default). */
  format?: "json" | "pretty";
  /** Output sink; defaults to the matching console method. */
  sink?: LogSink;
  /** Clock, injectable for deterministic tests. */
  now?: () => Date;
}

const LEVEL_ORDER: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
};

function isLogLevelSetting(value: string | undefined): value is LogLevel | "silent" {
  return value !== undefined && value in LEVEL_ORDER;
}

function defaultLevel(): LogLevel | "silent" {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (isLogLevelSetting(fromEnv)) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function defaultFormat(): "json" | "pretty" {
  return process.env.NODE_ENV === "production" ? "json" : "pretty";
}

const defaultSink: LogSink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console -- the logger IS the console wrapper
  else console.log(line);
};

/**
 * Make a value JSON-safe: Errors keep name/message/stack/code, circular
 * references become "[Circular]". (Ported from legacy/lib/log.ts.)
 */
export function serializeLogValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(code !== undefined ? { code } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeLogValue(item, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serializeLogValue(inner, seen);
    }
    return out;
  }
  return value;
}

function normalizeContext(context: LogContext | Error | undefined): LogContext {
  if (!context) return {};
  // A bare Error is the single most common "context": file it under `err`.
  if (context instanceof Error) return { err: context };
  return context;
}

function buildLogger(bound: LogContext, options: LoggerOptions): Logger {
  const emit = (level: LogLevel, message: string, context?: LogContext | Error): void => {
    // Resolve settings lazily so tests (and runtime) can change env between calls.
    const threshold = options.level ?? defaultLevel();
    if (LEVEL_ORDER[level] < LEVEL_ORDER[threshold]) return;

    const format = options.format ?? defaultFormat();
    const sink = options.sink ?? defaultSink;
    const now = options.now ?? (() => new Date());

    const merged = { ...bound, ...normalizeContext(context) };
    const serialized = serializeLogValue(merged) as LogContext;
    const time = now().toISOString();

    if (format === "json") {
      sink(level, JSON.stringify({ level, time, msg: message, ...serialized }));
      return;
    }

    const { scope, ...rest } = serialized;
    const parts = [
      time.slice(11, 23), // HH:mm:ss.SSS
      level.toUpperCase().padEnd(5),
      typeof scope === "string" && scope ? `[${scope}]` : null,
      message,
      Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
    ].filter((part): part is string => part !== null);
    sink(level, parts.join(" "));
  };

  return {
    debug: (message, context) => emit("debug", message, context),
    info: (message, context) => emit("info", message, context),
    warn: (message, context) => emit("warn", message, context),
    error: (message, context) => emit("error", message, context),
    child: (context) => buildLogger({ ...bound, ...context }, options),
  };
}

/**
 * Create a logger. `scope` becomes a bound `scope` field (shown as `[scope]`
 * in pretty output); `options` inject level/format/sink for tests or special
 * call sites. Most modules should do:
 *
 *   const log = createLogger("content-sync");
 */
export function createLogger(scope?: string, options: LoggerOptions = {}): Logger {
  return buildLogger(scope ? { scope } : {}, options);
}

/** The root application logger. Prefer `createLogger("scope")` in modules. */
export const logger: Logger = createLogger();
