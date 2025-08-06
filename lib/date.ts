import { formatDate } from "./utils"

/**
 * Format a post date consistently across the application.
 * Uses the generic formatDate utility and provides a
 * dedicated helper for post components.
 */
export function formatPostDate(date: string | Date): string {
  return formatDate(date)
}

