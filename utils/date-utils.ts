// Format date from WordPress format to readable format
export function formatDate(dateString: string): string {
  if (!dateString) return ""

  const date = new Date(dateString)

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return dateString
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

// Get relative time (e.g. "2 hours ago")
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return ""
  }

  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)

  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`
  }

  const diffInYears = Math.floor(diffInMonths / 12)

  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`
}
