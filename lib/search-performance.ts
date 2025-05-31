interface SearchMetrics {
  query: string
  responseTime: number
  resultCount: number
  source: string
  timestamp: number
  cached: boolean
  userId?: string
}

interface PerformanceStats {
  averageResponseTime: number
  totalSearches: number
  cacheHitRate: number
  slowQueries: SearchMetrics[]
  popularQueries: { query: string; count: number }[]
  errorRate: number
}

class SearchPerformanceMonitor {
  private metrics: SearchMetrics[] = []
  private errors: { query: string; error: string; timestamp: number }[] = []
  private readonly MAX_METRICS = 1000
  private readonly SLOW_QUERY_THRESHOLD = 2000 // 2 seconds

  recordSearch(
    query: string,
    responseTime: number,
    resultCount: number,
    source: string,
    cached: boolean,
    userId?: string,
  ) {
    const metric: SearchMetrics = {
      query: query.toLowerCase().trim(),
      responseTime,
      resultCount,
      source,
      timestamp: Date.now(),
      cached,
      userId,
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Log slow queries
    if (responseTime > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow search query detected: "${query}" took ${responseTime}ms`)
    }
  }

  recordError(query: string, error: string) {
    this.errors.push({
      query: query.toLowerCase().trim(),
      error,
      timestamp: Date.now(),
    })

    // Keep only recent errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }
  }

  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        averageResponseTime: 0,
        totalSearches: 0,
        cacheHitRate: 0,
        slowQueries: [],
        popularQueries: [],
        errorRate: 0,
      }
    }

    const recentMetrics = this.metrics.filter((m) => Date.now() - m.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours

    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const cachedSearches = recentMetrics.filter((m) => m.cached).length
    const cacheHitRate = (cachedSearches / recentMetrics.length) * 100

    // Find slow queries
    const slowQueries = recentMetrics
      .filter((m) => m.responseTime > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10)

    // Calculate popular queries
    const queryCount = new Map<string, number>()
    recentMetrics.forEach((m) => {
      queryCount.set(m.query, (queryCount.get(m.query) || 0) + 1)
    })

    const popularQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const recentErrors = this.errors.filter((e) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000)
    const errorRate = (recentErrors.length / (recentMetrics.length + recentErrors.length)) * 100

    return {
      averageResponseTime: Math.round(averageResponseTime),
      totalSearches: recentMetrics.length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueries,
      popularQueries,
      errorRate: Math.round(errorRate * 100) / 100,
    }
  }

  getOptimizationSuggestions(): string[] {
    const stats = this.getStats()
    const suggestions: string[] = []

    if (stats.averageResponseTime > 1000) {
      suggestions.push("Consider implementing search result caching")
    }

    if (stats.cacheHitRate < 50) {
      suggestions.push("Increase cache TTL or improve cache key strategy")
    }

    if (stats.slowQueries.length > 5) {
      suggestions.push("Optimize database queries or implement search indexing")
    }

    if (stats.errorRate > 5) {
      suggestions.push("Improve error handling and fallback mechanisms")
    }

    return suggestions
  }

  getRealtimeStatus() {
    const recentMetrics = this.metrics.filter((m) => Date.now() - m.timestamp < 5 * 60 * 1000) // Last 5 minutes

    if (recentMetrics.length === 0) {
      return { status: "unknown", message: "No recent search activity" }
    }

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const recentErrors = this.errors.filter((e) => Date.now() - e.timestamp < 5 * 60 * 1000)

    if (recentErrors.length > recentMetrics.length * 0.1) {
      return { status: "degraded", message: "High error rate detected" }
    }

    if (avgResponseTime > 2000) {
      return { status: "slow", message: "Search responses are slower than usual" }
    }

    if (avgResponseTime > 1000) {
      return { status: "warning", message: "Search responses are slightly slow" }
    }

    return { status: "good", message: "Search performance is optimal" }
  }

  clearMetrics() {
    this.metrics = []
    this.errors = []
  }
}

export const searchPerformanceMonitor = new SearchPerformanceMonitor()
