import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }

  const now = new Date()
  const diffInMs = now.getTime() - dateObj.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

  // If less than 24 hours ago, show relative time
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes} minutes ago`
    }
    const hours = Math.floor(diffInHours)
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }

  // If less than 7 days ago, show days
  if (diffInDays < 7) {
    const days = Math.floor(diffInDays)
    return days === 1 ? "1 day ago" : `${days} days ago`
  }

  // Otherwise show formatted date
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatRelativeTime(date: string | Date): string {
  return formatDate(date)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "..."
}

export function generateExcerpt(content: string, maxLength = 160): string {
  // Remove HTML tags
  const textOnly = content.replace(/<[^>]*>/g, "")
  return truncateText(textOnly, maxLength)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function debounce<T extends (..._args: any[]) => any>(
  func: T,
  wait: number,
): (..._args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
