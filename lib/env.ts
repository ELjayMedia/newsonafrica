const REQUIRED_RUNTIME_ENV_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const

let validated = false

const isBlank = (value: string | undefined): boolean => !value || value.trim().length === 0

export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function validateRequiredEnv(): void {
  if (validated) {
    return
  }

  const missing = REQUIRED_RUNTIME_ENV_VARS.filter((key) => isBlank(process.env[key]))

  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`)
  }

  validated = true
}
