/**
 * Enhanced search performance monitoring and optimization
 */

interface SearchMetric {
  query: string
  responseTime: number
  resultCount: number
  source: string
  timestamp: number
  cached: boolean
  userId?: string
  sessionId?: string
}

interface PerformanceStats {
  totalSearches: number
  averageResponseTime: number
  medianResponseTime: number
  cacheHitRate: number
  popularQueries: Array<{ query: string; count: number; avgTime: number }>
  slowQueries: Array<{ query: string; avgTime: number; count: number }>
  searchTrends: Array<{ hour: string; searches: number; avgTime: number }>
  errorRate: number
}

interface OptimizationSuggestion {
  type: "cache" | "index" | "query" | "performance"
  priority: "high" | "medium" | "low"
  message: string
  action?: string
}

class SearchPerformanceMonitor {
  private metrics: SearchMetric[] = []
  private queryFrequency: Map<string, number> = new Map()
  private queryTimes: Map<string, number[]> = new Map()
  private errorCount = 0
  private readonly MAX_METRICS = 2000 // Increased capacity
  private readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private readonly CACHE_ANALYSIS_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Record a search operation with enhanced tracking
   */
  recordSearch(
    query: string,
    responseTime: number,
    resultCount: number,
    source: string,
    cached: boolean,
    userId?: string,
    sessionId?: string,
  ): void {
    const normalizedQuery = query.toLowerCase().trim()

    const metric: SearchMetric = {
      query: normalizedQuery,
      responseTime,
      resultCount,
      source,
      timestamp: Date.now(),
      cached,
      userId,
      sessionId,
    }

    this.metrics.push(metric)

    // Update frequency tracking
    this.queryFrequency.set(normalizedQuery, (this.queryFrequency.get(normalizedQuery) || 0) + 1)

    // Update response time tracking
    if (!this.queryTimes.has(normalizedQuery)) {
      this.queryTimes.set(normalizedQuery, [])
    }
    this.queryTimes.get(normalizedQuery)!.push(responseTime)

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      const removeCount = Math.floor(this.MAX_METRICS * 0.1) // Remove 10%
      this.metrics = this.metrics.slice(removeCount)
    }

    // Clean old frequency data periodically
    if (this.metrics.length % 100 === 0) {
      this.cleanOldData()
    }
  }

  /**
   * Record search error
   */
  recordError(query: string, error: string): void {
    this.errorCount++
    console.error(`Search error for query "${query}":`, error)
  }

  /**
   * Get comprehensive performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return this.getEmptyStats()
    }

    const recentMetrics = this.getRecentMetrics()
    const responseTimes = recentMetrics.map((m) => m.responseTime).sort((a, b) => a - b)

    return {
      totalSearches: recentMetrics.length,
      averageResponseTime: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
      medianResponseTime: this.calculateMedian(responseTimes),
      cacheHitRate: this.calculateCacheHitRate(recentMetrics),
      popularQueries: this.getPopularQueries(),
      slowQueries: this.getSlowQueries(),
      searchTrends: this.getSearchTrends(),
      errorRate: this.calculateErrorRate(),
    }
  }

  /**
   * Get recent metrics within analysis window
   */
  private getRecentMetrics(): SearchMetric[] {
    const cutoff = Date.now() - this.CACHE_ANALYSIS_WINDOW
    return this.metrics.filter((metric) => metric.timestamp >= cutoff)
  }

  /**
   * Calculate median response time
   */
  private calculateMedian(sortedTimes: number[]): number {
    const mid = Math.floor(sortedTimes.length / 2)
    return sortedTimes.length % 2 === 0 ? Math.round((sortedTimes[mid - 1] + sortedTimes[mid]) / 2) : sortedTimes[mid]
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(metrics: SearchMetric[]): number {
    if (metrics.length === 0) return 0
    const cachedCount = metrics.filter((m) => m.cached).length
    return Math.round((cachedCount / metrics.length) * 100)
  }

  /**
   * Get popular queries with performance data
   */
  private getPopularQueries(): Array<{ query: string; count: number; avgTime: number }> {
    const recentQueries = new Map<string, { count: number; totalTime: number }>()

    this.getRecentMetrics().forEach((metric) => {
      if (!recentQueries.has(metric.query)) {
        recentQueries.set(metric.query, { count: 0, totalTime: 0 })
      }
      const data = recentQueries.get(metric.query)!
      data.count++
      data.totalTime += metric.responseTime
    })

    return Array.from(recentQueries.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count),
      }))
      .filter((item) => item.count > 1) // Only show queries with multiple searches
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  /**
   * Get slow queries that need optimization
   */
  private getSlowQueries(): Array<{ query: string; avgTime: number; count: number }> {
    const slowQueries = new Map<string, { totalTime: number; count: number }>()

    this.getRecentMetrics()
      .filter((metric) => metric.responseTime > this.SLOW_QUERY_THRESHOLD)
      .forEach((metric) => {
        if (!slowQueries.has(metric.query)) {
          slowQueries.set(metric.query, { totalTime: 0, count: 0 })
        }
        const data = slowQueries.get(metric.query)!
        data.totalTime += metric.responseTime
        data.count++
      })

    return Array.from(slowQueries.entries())
      .map(([query, data]) => ({
        query,
        avgTime: Math.round(data.totalTime / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10)
  }

  /**
   * Get search trends over time
   */
  private getSearchTrends(hours = 24): Array<{ hour: string; searches: number; avgTime: number }> {
    const now = Date.now()
    const hourlyData = new Map<string, { count: number; totalTime: number }>()

    // Initialize all hours
    for (let i = 0; i < hours; i++) {
      const hourTime = new Date(now - i * 60 * 60 * 1000)
      const hourKey = hourTime.toISOString().slice(0, 13) // YYYY-MM-DDTHH
      hourlyData.set(hourKey, { count: 0, totalTime: 0 })
    }

    // Populate with actual data
    this.getRecentMetrics().forEach((metric) => {
      const hour = new Date(metric.timestamp).toISOString().slice(0, 13)
      if (hourlyData.has(hour)) {
        const data = hourlyData.get(hour)!
        data.count++
        data.totalTime += metric.responseTime
      }
    })

    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        searches: data.count,
        avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour))
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const totalOperations = this.metrics.length + this.errorCount
    return totalOperations > 0 ? Math.round((this.errorCount / totalOperations) * 100) : 0
  }

  /**
   * Get optimization suggestions based on performance data
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const stats = this.getStats()
    const suggestions: OptimizationSuggestion[] = []

    // Cache optimization suggestions
    if (stats.cacheHitRate < 30) {
      suggestions.push({
        type: "cache",
        priority: "high",
        message: `Cache hit rate is low (${stats.cacheHitRate}%)`,
        action: "Increase cache TTL or implement more aggressive caching",
      })
    }

    // Performance suggestions
    if (stats.averageResponseTime > 2000) {
      suggestions.push({
        type: "performance",
        priority: "high",
        message: `Average response time is high (${stats.averageResponseTime}ms)`,
        action: "Consider implementing search indexing or optimizing queries",
      })
    }

    // Index suggestions
    if (stats.slowQueries.length > 5) {
      suggestions.push({
        type: "index",
        priority: "medium",
        message: `${stats.slowQueries.length} queries are consistently slow`,
        action: "Review and optimize slow queries or improve indexing",
      })
    }

    // Popular query optimization
    const topQuery = stats.popularQueries[0]
    if (topQuery && topQuery.count > 20 && topQuery.avgTime > 1000) {
      suggestions.push({
        type: "query",
        priority: "medium",
        message: `Popular query "${topQuery.query}" is slow (${topQuery.avgTime}ms)`,
        action: "Consider pre-caching results for this query",
      })
    }

    // Error rate suggestions
    if (stats.errorRate > 5) {
      suggestions.push({
        type: "performance",
        priority: "high",
        message: `High error rate (${stats.errorRate}%)`,
        action: "Investigate and fix search errors",
      })
    }

    return suggestions
  }

  /**
   * Get performance insights
   */
  getInsights(): string[] {
    const stats = this.getStats()
    const insights: string[] = []

    if (stats.cacheHitRate > 70) {
      insights.push("Excellent cache performance - most searches are served from cache")
    }

    if (stats.averageResponseTime < 500) {
      insights.push("Fast search response times - users are getting quick results")
    }

    if (stats.popularQueries.length > 0) {
      const topQuery = stats.popularQueries[0]
      insights.push(`Most popular search: "${topQuery.query}" (${topQuery.count} searches)`)
    }

    const peakHour = stats.searchTrends.reduce((max, hour) => (hour.searches > max.searches ? hour : max))
    if (peakHour.searches > 0) {
      insights.push(`Peak search activity: ${peakHour.hour.slice(-2)}:00 (${peakHour.searches} searches)`)
    }

    return insights
  }

  /**
   * Clean old data to prevent memory leaks
   */
  private cleanOldData(): void {
    const cutoff = Date.now() - this.CACHE_ANALYSIS_WINDOW * 2 // Keep 2x analysis window

    // Clean old query frequency data
    const oldQueries = Array.from(this.queryFrequency.keys()).filter((query) => {
      const lastSeen = this.metrics
        .filter((m) => m.query === query)
        .reduce((latest, m) => Math.max(latest, m.timestamp), 0)
      return lastSeen < cutoff
    })

    oldQueries.forEach((query) => {
      this.queryFrequency.delete(query)
      this.queryTimes.delete(query)
    })
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      const headers = ["timestamp", "query", "responseTime", "resultCount", "source", "cached"]
      const rows = this.metrics.map((m) => [
        new Date(m.timestamp).toISOString(),
        m.query,
        m.responseTime,
        m.resultCount,
        m.source,
        m.cached,
      ])
      return [headers, ...rows].map((row) => row.join(",")).join("\n")
    }

    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * Get empty stats structure
   */
  private getEmptyStats(): PerformanceStats {
    return {
      totalSearches: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      cacheHitRate: 0,
      popularQueries: [],
      slowQueries: [],
      searchTrends: [],
      errorRate: 0,
    }
  }

  /**
   * Reset all metrics and counters
   */
  reset(): void {
    this.metrics = []
    this.queryFrequency.clear()
    this.queryTimes.clear()
    this.errorCount = 0
  }

  /**
   * Get real-time performance status
   */
  getRealtimeStatus(): { status: "good" | "warning" | "critical"; message: string } {
    const recentMetrics = this.metrics.slice(-10) // Last 10 searches

    if (recentMetrics.length === 0) {
      return { status: "good", message: "No recent search activity" }
    }

    const avgRecentTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const recentErrors = recentMetrics.filter((m) => m.resultCount === 0).length

    if (avgRecentTime > 3000 || recentErrors > 3) {
      return { status: "critical", message: "Search performance is degraded" }
    }

    if (avgRecentTime > 1500 || recentErrors > 1) {
      return { status: "warning", message: "Search performance is slower than usual" }
    }

    return { status: "good", message: "Search performance is optimal" }
  }
}

// Export singleton instance
export const searchPerformanceMonitor = new SearchPerformanceMonitor()

// Export types
export type { SearchMetric, PerformanceStats, OptimizationSuggestion }
