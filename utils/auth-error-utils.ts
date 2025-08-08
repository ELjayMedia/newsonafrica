export enum AuthErrorCategory {
CREDENTIALS = "credentials",
NETWORK = "network",
VALIDATION = "validation",
RATE_LIMIT = "rate_limit",
SERVER = "server",
UNKNOWN = "unknown",
}

export interface AuthError {
message: string
category: AuthErrorCategory
suggestion?: string
originalError?: any
}

export function categorizeAuthError(error: any): AuthError {
if (!error) {
  return {
    message: "An unknown error occurred",
    category: AuthErrorCategory.UNKNOWN,
  }
}

const message = error.message || error.error_description || "An unknown error occurred"

// Network errors
if (error.name === "NetworkError" || message.includes("network") || message.includes("fetch")) {
  return {
    message: "Network connection error. Please check your internet connection.",
    category: AuthErrorCategory.NETWORK,
    suggestion: "Check your internet connection and try again.",
    originalError: error,
  }
}

// Rate limiting
if (message.includes("rate limit") || message.includes("too many requests")) {
  return {
    message: "Too many requests. Please wait a moment before trying again.",
    category: AuthErrorCategory.RATE_LIMIT,
    suggestion: "Wait a few minutes before attempting to sign in again.",
    originalError: error,
  }
}

// Validation errors
if (message.includes("invalid format") || message.includes("validation")) {
  return {
    message: "Please check your input and try again.",
    category: AuthErrorCategory.VALIDATION,
    suggestion: "Ensure all fields are filled out correctly.",
    originalError: error,
  }
}

// Credential errors
if (
  message.includes("Invalid login credentials") ||
  message.includes("Email not confirmed") ||
  message.includes("User not found")
) {
  return {
    message,
    category: AuthErrorCategory.CREDENTIALS,
    suggestion: "Double-check your email and password, or try resetting your password.",
    originalError: error,
  }
}

// Server errors
if (message.includes("server") || error.status >= 500) {
  return {
    message: "Server error. Please try again later.",
    category: AuthErrorCategory.SERVER,
    suggestion: "Our servers are experiencing issues. Please try again in a few minutes.",
    originalError: error,
  }
}

// Default to unknown
return {
  message,
  category: AuthErrorCategory.UNKNOWN,
  originalError: error,
}
}

/**
* Normalizes unknown errors into a structured AuthError using categorizeAuthError.
*/
export function parseAuthError(error: any): AuthError {
return categorizeAuthError(error);
}

/**
* Parses and logs auth errors in a consistent way.
* Returns the parsed AuthError so callers can display user-friendly messages.
*/
export function logAuthError(error: any, context?: string): AuthError {
const parsed = categorizeAuthError(error);

try {
  const payload = {
    context: context ?? 'auth',
    category: parsed.category,
    message: parsed.message,
    suggestion: parsed.suggestion,
  };

  // Prefer warn on client to reduce noise, error on server logs/observability.
  if (typeof window === 'undefined') {
    // Server-side
    console.error('[AuthError]', payload, { originalError: parsed.originalError ?? error });
  } else {
    // Client-side
    console.warn('[AuthError]', payload);
  }
} catch {
  // Swallow any logging failures to avoid cascading errors
}

return parsed;
}
