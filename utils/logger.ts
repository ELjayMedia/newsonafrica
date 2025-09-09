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

function shouldLog() {
  return process.env.NODE_ENV === "development"
}

function output(level: "log" | "warn" | "error", ...args: any[]) {
  if (!shouldLog()) return
  const sanitized = args.map(sanitize)
  ;(console as any)[level](...sanitized)
}

const logger = {
  log: (...args: any[]) => output("log", ...args),
  warn: (...args: any[]) => output("warn", ...args),
  error: (...args: any[]) => output("error", ...args),
}

export default logger
