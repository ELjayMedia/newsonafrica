/**
 * Formats a date string into a human-readable format
 *
 * @param dateString The date string to format
 * @param includeTime Whether to include the time in the formatted date
 * @returns Formatted date string
 */
export function formatDate(dateString: string, includeTime = false): string {
  try {
    const date = new Date(dateString)

    if (isNaN(date.getTime())) {
      return "Invalid date"
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    }

    if (includeTime) {
      options.hour = "2-digit"
      options.minute = "2-digit"
    }

    return date.toLocaleDateString("en-US", options)
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateString || "Unknown date"
  }
}
