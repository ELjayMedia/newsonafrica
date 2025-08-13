// Types for fetch responses and error handling
export interface FetchResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  status?: number;
  statusText?: string;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  baseURL?: string;
  // the parameter is intentionally prefixed with an underscore to avoid
  // no-unused-vars warnings while still documenting the callback shape
  validateStatus?: (_status: number) => boolean;
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  // mark parameters as unused to satisfy the linter without altering the
  // external API of the callback
  retryCondition?: (_error: Error, _attempt: number) => boolean;
}

/**
 * Enhanced fetch wrapper with comprehensive error handling
 * @param url - The URL to fetch
 * @param options - Extended fetch options with additional features
 * @returns Promise with typed response data and error information
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    baseURL = '',
    validateStatus = (status) => status >= 200 && status < 300,
    ...fetchOptions
  } = options;

  const fullUrl = baseURL ? `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;

  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetchWithRetry(
      fullUrl,
      {
        ...fetchOptions,
        signal: controller.signal,
      },
      { retries, retryDelay },
    );

    clearTimeout(timeoutId);

    // Check if status is considered successful
    if (!validateStatus(response.status)) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
        success: false,
        status: response.status,
        statusText: response.statusText,
      };
    }

    // Parse response based on content type
    const data = await parseResponse<T>(response);

    return {
      data,
      error: null,
      success: true,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const errorMessage = getErrorMessage(error);
    console.error(`Fetch error for ${fullUrl}:`, errorMessage);

    return {
      data: null,
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Simple fetch wrapper for backward compatibility
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Promise with data or null on error
 */
export async function simpleFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.error(`Fetch failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

/**
 * Fetch with automatic retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig,
): Promise<Response> {
  const { retries, retryDelay, retryCondition } = retryConfig;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on successful responses or client errors (4xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server errors (5xx) should be retried
      if (attempt < retries) {
        console.warn(
          `Fetch attempt ${attempt + 1} failed with status ${response.status}, retrying...`,
        );
        await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }

      return response;
    } catch (error) {
      const shouldRetry = retryCondition
        ? retryCondition(error as Error, attempt)
        : attempt < retries && isRetryableError(error as Error);

      if (shouldRetry) {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying...`, error);
        await delay(retryDelay * Math.pow(2, attempt));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Parse response based on content type
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (!contentType) {
    const text = await response.text();
    return text as unknown as T;
  }

  if (contentType.includes('application/json')) {
    return await response.json();
  }

  if (contentType.includes('text/')) {
    const text = await response.text();
    return text as unknown as T;
  }

  if (contentType.includes('application/octet-stream') || contentType.includes('image/')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  // Default to JSON parsing
  return await response.json();
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  // Network errors, timeouts, and connection issues are retryable
  const retryableErrors = [
    'NetworkError',
    'TimeoutError',
    'AbortError',
    'TypeError', // Often network-related
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
  ];

  return retryableErrors.some(
    (retryableError) =>
      error.name.includes(retryableError) || error.message.includes(retryableError),
  );
}

/**
 * Extract meaningful error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      return 'Request timeout - please try again';
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network error - please check your connection';
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Utility function for delays
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Specialized fetch functions for common use cases
 */

/**
 * GET request with error handling
 */
export async function get<T>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {},
): Promise<FetchResponse<T>> {
  return fetchWithErrorHandling<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request with error handling
 */
export async function post<T>(
  url: string,
  data?: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {},
): Promise<FetchResponse<T>> {
  return fetchWithErrorHandling<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request with error handling
 */
export async function put<T>(
  url: string,
  data?: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {},
): Promise<FetchResponse<T>> {
  return fetchWithErrorHandling<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request with error handling
 */
export async function del<T>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {},
): Promise<FetchResponse<T>> {
  return fetchWithErrorHandling<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Upload file with progress tracking
 */
export async function uploadFile<T>(
  url: string,
  file: File,
  options: Omit<FetchOptions, 'method' | 'body'> = {},
): Promise<FetchResponse<T>> {
  const formData = new FormData();
  formData.append('file', file);

  // Note: Progress tracking requires XMLHttpRequest for now
  // This is a simplified version using fetch
  return fetchWithErrorHandling<T>(url, {
    ...options,
    method: 'POST',
    body: formData,
  });
}

/**
 * Fetch with caching support
 */
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export async function fetchWithCache<T>(
  url: string,
  options: FetchOptions & { cacheTTL?: number } = {},
): Promise<FetchResponse<T>> {
  const { cacheTTL = 300000, ...fetchOptions } = options; // Default 5 minutes
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return {
      data: cached.data,
      error: null,
      success: true,
    };
  }

  // Fetch fresh data
  const response = await fetchWithErrorHandling<T>(url, fetchOptions);

  // Cache successful responses
  if (response.success && response.data) {
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });
  }

  return response;
}

/**
 * Clear fetch cache
 */
export function clearFetchCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Export the simple version for backward compatibility
