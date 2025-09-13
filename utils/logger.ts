const SENSITIVE_KEYS = ["password", "token", "secret"]

function sanitize(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sanitize)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
          return [key, "[REDACTED]"]
        }
        return [key, sanitize(val)]
      }),
    )
  }
  return value
}

type LogLevel = "debug" | "info" | "warn" | "error"

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getEnvLevel() {
  return process.env.NODE_ENV === "development" ? LEVELS.debug : LEVELS.warn
}

function output(level: LogLevel, ...args: any[]) {
  if (LEVELS[level] < getEnvLevel()) return
  const sanitized = args.map(sanitize)
  const method = level === "debug" ? "log" : level
  ;(console as any)[method](...sanitized)
}

const logger = {
  debug: (...args: any[]) => output("debug", ...args),
  info: (...args: any[]) => output("info", ...args),
  warn: (...args: any[]) => output("warn", ...args),
  error: (...args: any[]) => output("error", ...args),
}

export default logger
