/**
 * Authentication Error Utilities
 *
 * Provides functions for handling and formatting authentication errors
 */

// Define error categories for better handling
export enum AuthErrorCategory {
  CREDENTIALS = "credentials",
  NETWORK = "network",
  VALIDATION = "validation",
  RATE_LIMIT = "rate_limit",
  SERVER = "server",
  UNKNOWN = "unknown",
}

// Interface for structured auth errors
export interface AuthError {
  message: string
  category: AuthErrorCategory
  originalError?: any
  code?: string
  suggestion?: string
}

/**
 * Maps common Supabase error messages to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, { message: string; category: AuthErrorCategory; suggestion?: string }> = {
  // Credential errors
  "Invalid login credentials": {
    message: "The email or password you entered is incorrect.",
    category: AuthErrorCategory.CREDENTIALS,
    suggestion: "Please check your email and password and try again.",
  },
  "Email not confirmed": {
    message: "Your email address has not been verified.",
    category: AuthErrorCategory.CREDENTIALS,
    suggestion: "Please check your inbox and click the verification link.",
  },
  "User not found": {
    message: "We couldn't find an account with that email address.",
    category: AuthErrorCategory.CREDENTIALS,
    suggestion: "Please check your email or create a new account.",
  },

  // Network errors
  "Failed to fetch": {
    message: "Unable to connect to the authentication service.",
    category: AuthErrorCategory.NETWORK,
    suggestion: "Please check your internet connection and try again.",
  },
  "Network request failed": {
    message: "Network connection issue detected.",
    category: AuthErrorCategory.NETWORK,
    suggestion: "Please check your internet connection and try again.",
  },

  // Validation errors
  "Password should be at least 6 characters": {
    message: "Your password is too short.",
    category: AuthErrorCategory.VALIDATION,
    suggestion: "Please use a password with at least 6 characters.",
  },
  "Username already exists": {
    message: "This username is already taken.",
    category: AuthErrorCategory.VALIDATION,
    suggestion: "Please choose a different username.",
  },
  "User already registered": {
    message: "An account with this email already exists.",
    category: AuthErrorCategory.VALIDATION,
    suggestion: "Please use a different email or try signing in instead.",
  },

  // Rate limit errors
  "Too many requests": {
    message: "Too many login attempts.",
    category: AuthErrorCategory.RATE_LIMIT,
    suggestion: "Please wait a few minutes before trying again.",
  },

  // Server errors
  "500": {
    message: "Authentication service is currently unavailable.",
    category: AuthErrorCategory.SERVER,
    suggestion: "Please try again later or contact support if the problem persists.",
  },
}

/**
 * Parses an authentication error and returns a structured error object
 *
 * @param error - The original error object
 * @returns A structured AuthError object
 */
export function parseAuthError(error: any): AuthError {
  // Default error
  const defaultError: AuthError = {
    message: "Authentication failed. Please try again.",
    category: AuthErrorCategory.UNKNOWN,
    originalError: error,
  }

  if (!error) return defaultError

  // Extract error message
  const errorMessage =
    typeof error === "string" ? error : error.message || error.error_description || JSON.stringify(error)

  // Check for known error patterns
  for (const [pattern, errorInfo] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(pattern)) {
      return {
        message: errorInfo.message,
        category: errorInfo.category,
        suggestion: errorInfo.suggestion,
        originalError: error,
        code: extractErrorCode(error),
      }
    }
  }

  // Handle network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("connection") ||
    (error.name === "TypeError" && errorMessage.includes("fetch"))
  ) {
    return {
      message: "Network connection issue detected.",
      category: AuthErrorCategory.NETWORK,
      suggestion: "Please check your internet connection and try again.",
      originalError: error,
    }
  }

  // Handle validation errors
  if (errorMessage.includes("password") || errorMessage.includes("email") || errorMessage.includes("username")) {
    return {
      message: errorMessage,
      category: AuthErrorCategory.VALIDATION,
      originalError: error,
      code: extractErrorCode(error),
    }
  }

  // Return default with original message
  return {
    message: errorMessage,
    category: AuthErrorCategory.UNKNOWN,
    originalError: error,
    code: extractErrorCode(error),
  }
}

/**
 * Extracts an error code from various error formats
 */
function extractErrorCode(error: any): string | undefined {
  if (!error) return undefined

  // Supabase error code
  if (error.code) return String(error.code)

  // HTTP status code
  if (error.status) return String(error.status)

  // Try to extract from message
  const codeMatch = /\b(\d{3,4})\b/.exec(error.message || "")
  if (codeMatch) return codeMatch[1]

  return undefined
}

/**
 * Logs authentication errors with appropriate level and context
 */
export function logAuthError(error: AuthError): void {
  const { category, message, originalError, code } = error

  // Determine log level based on category
  switch (category) {
    case AuthErrorCategory.NETWORK:
    case AuthErrorCategory.VALIDATION:
      console.warn(`Auth error (${category}${code ? ` - ${code}` : ""}): ${message}`, originalError)
      break
    case AuthErrorCategory.CREDENTIALS:
      console.info(`Auth error (${category}${code ? ` - ${code}` : ""}): ${message}`)
      break
    case AuthErrorCategory.SERVER:
    case AuthErrorCategory.RATE_LIMIT:
    case AuthErrorCategory.UNKNOWN:
    default:
      console.error(`Auth error (${category}${code ? ` - ${code}` : ""}): ${message}`, originalError)
  }
}
