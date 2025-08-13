// Simple search performance monitoring

interface SearchMetric {
  query: string;
  responseTime: number;
  resultCount: number;
  source: string;
  timestamp: number;
  cached: boolean;
}

interface ErrorMetric {
  query: string;
  error: string;
  timestamp: number;
}

class SearchPerformanceMonitor {
  private metrics: SearchMetric[] = [];
  private errors: ErrorMetric[] = [];
  private readonly maxMetrics = 100;
  private readonly maxErrors = 50;

  recordSearch(
    query: string,
    responseTime: number,
    resultCount: number,
    source: string,
    cached: boolean,
  ): void {
    this.metrics.push({
      query,
      responseTime,
      resultCount,
      source,
      timestamp: Date.now(),
      cached,
    });

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  recordError(query: string, error: string): void {
    this.errors.push({
      query,
      error,
      timestamp: Date.now(),
    });

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  getStats() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter((m) => now - m.timestamp < 24 * 60 * 60 * 1000); // Last 24 hours

    if (recentMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        totalSearches: 0,
        cacheHitRate: 0,
        errorRate: 0,
        popularQueries: [],
      };
    }

    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const cacheHits = recentMetrics.filter((m) => m.cached).length;
    const cacheHitRate = cacheHits / recentMetrics.length;

    // Count query occurrences
    const queryCounts = new Map<string, number>();
    recentMetrics.forEach((m) => {
      const count = queryCounts.get(m.query) || 0;
      queryCounts.set(m.query, count + 1);
    });

    // Get popular queries
    const popularQueries = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return {
      avgResponseTime,
      totalSearches: recentMetrics.length,
      cacheHitRate,
      errorRate: this.errors.length / (recentMetrics.length || 1),
      popularQueries,
    };
  }

  getRealtimeStatus() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter((m) => now - m.timestamp < 5 * 60 * 1000); // Last 5 minutes
    const recentErrors = this.errors.filter((e) => now - e.timestamp < 5 * 60 * 1000); // Last 5 minutes

    if (recentMetrics.length === 0) {
      return {
        status: 'unknown',
        avgResponseTime: 0,
        errorRate: 0,
      };
    }

    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const errorRate = recentErrors.length / (recentMetrics.length || 1);

    let status = 'good';
    if (errorRate > 0.1) {
      status = 'error';
    } else if (avgResponseTime > 1000) {
      status = 'slow';
    } else if (avgResponseTime > 500) {
      status = 'warning';
    }

    return {
      status,
      avgResponseTime,
      errorRate,
    };
  }
}

export const searchPerformanceMonitor = new SearchPerformanceMonitor();
