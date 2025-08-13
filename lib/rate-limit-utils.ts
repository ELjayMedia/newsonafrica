interface RateLimitInfo {
  count: number;
  resetTime: number;
  isLimited: boolean;
}

// Map to store rate limit info by key
const rateLimitMap = new Map<string, RateLimitInfo>();

// Clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, info] of rateLimitMap.entries()) {
    if (now > info.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Check if a request is rate limited
 * @param key Unique identifier for the rate limit (e.g., API endpoint, user ID)
 * @param limit Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns Object with isLimited flag and retryAfter time in seconds
 */
export function checkRateLimit(key: string, limit: number, windowMs = 60000) {
  const now = Date.now();

  // Get or create rate limit info
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 0,
      resetTime: now + windowMs,
      isLimited: false,
    });
  }

  const info = rateLimitMap.get(key)!;

  // Reset if window has passed
  if (now > info.resetTime) {
    info.count = 0;
    info.resetTime = now + windowMs;
    info.isLimited = false;
  }

  // Check if already limited
  if (info.isLimited) {
    const retryAfter = Math.ceil((info.resetTime - now) / 1000);
    return { isLimited: true, retryAfter };
  }

  // Increment count and check limit
  info.count += 1;

  if (info.count > limit) {
    info.isLimited = true;
    const retryAfter = Math.ceil((info.resetTime - now) / 1000);
    return { isLimited: true, retryAfter };
  }

  return { isLimited: false, retryAfter: 0 };
}

/**
 * Implements exponential backoff for retries
 * @param baseDelay Base delay in milliseconds
 * @param retryCount Current retry count
 * @param maxMultiplier Maximum multiplier to apply
 * @returns Delay in milliseconds
 */
export function calculateBackoff(baseDelay: number, retryCount: number, maxMultiplier = 10) {
  const multiplier = Math.min(Math.pow(2, retryCount), maxMultiplier);
  return baseDelay * multiplier;
}

/**
 * Format a retry-after message for users
 * @param seconds Seconds to wait
 * @returns Formatted message
 */
export function formatRetryMessage(seconds: number): string {
  if (seconds < 60) {
    return `Please try again in ${seconds} seconds`;
  } else if (seconds < 120) {
    return `Please try again in 1 minute`;
  } else {
    const minutes = Math.ceil(seconds / 60);
    return `Please try again in ${minutes} minutes`;
  }
}
