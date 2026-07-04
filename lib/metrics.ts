/**
 * Lightweight in-process metrics (NOA-118) — counters and duration timers
 * with an exporter-ready interface, inspired by `legacy/lib/metrics/sink.ts`
 * but decoupled from any transport.
 *
 * Design:
 *  - **Counters**: `metrics.increment("webhook.received", 1, { action })`.
 *  - **Timers**: `metrics.observe("sync.page_ms", 123)` records count /
 *    total / min / max per series, or wrap work with
 *    `metrics.time("sync.page_ms", () => ...)`.
 *  - **Labels** become part of the series key (`name{a=b,c=d}`, keys
 *    sorted) so the same metric with different labels tracks separately —
 *    the shape Prometheus/StatsD-style exporters expect.
 *  - **Registry is in-memory and per-process** (fine on a single Vercel
 *    Node instance; numbers reset on deploy/restart). The `MetricsExporter`
 *    interface is the seam for shipping snapshots to a real backend
 *    (Prometheus remote-write, StatsD, a log drain, the legacy
 *    METRICS_FORWARD_URL webhook…) without touching call sites: implement
 *    `export(snapshot)` and call `registry.flush(exporter)` on a schedule
 *    or per-request.
 *
 * Like `lib/rate-limit.ts`, the process-wide registry lives on
 * `globalThis` so dev-mode HMR doesn't silently reset it, and the module
 * stays client-safe (no server-only / Node imports).
 */

export type MetricLabels = Record<string, string | number | boolean>;

export interface TimerStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

export interface MetricsSnapshot {
  /** ISO timestamp at which the snapshot was taken. */
  at: string;
  counters: Record<string, number>;
  timers: Record<string, TimerStats>;
}

/** The seam for wiring a real metrics backend. */
export interface MetricsExporter {
  export(snapshot: MetricsSnapshot): void | Promise<void>;
}

export interface MetricsRegistry {
  /** Add `by` (default 1) to a counter series. */
  increment(name: string, by?: number, labels?: MetricLabels): void;
  /** Record one duration (milliseconds) into a timer series. */
  observe(name: string, durationMs: number, labels?: MetricLabels): void;
  /** Time an async or sync function into a timer series (errors still record). */
  time<T>(name: string, fn: () => T | Promise<T>, labels?: MetricLabels): Promise<T>;
  /** Point-in-time copy of every series. */
  snapshot(): MetricsSnapshot;
  /** Snapshot, hand to the exporter, and (on success) reset — delta semantics. */
  flush(exporter: MetricsExporter): Promise<void>;
  /** Drop all series (tests, or after a successful flush). */
  reset(): void;
}

/** `name{a=b,c=d}` with label keys sorted for a stable series identity. */
export function seriesKey(name: string, labels?: MetricLabels): string {
  if (!labels) return name;
  const entries = Object.entries(labels).sort(([a], [b]) => (a < b ? -1 : 1));
  if (entries.length === 0) return name;
  return `${name}{${entries.map(([key, value]) => `${key}=${String(value)}`).join(",")}}`;
}

export function createMetricsRegistry(now: () => number = Date.now): MetricsRegistry {
  const counters = new Map<string, number>();
  const timers = new Map<string, TimerStats>();

  const registry: MetricsRegistry = {
    increment(name, by = 1, labels) {
      const key = seriesKey(name, labels);
      counters.set(key, (counters.get(key) ?? 0) + by);
    },

    observe(name, durationMs, labels) {
      const key = seriesKey(name, labels);
      const existing = timers.get(key);
      if (!existing) {
        timers.set(key, { count: 1, totalMs: durationMs, minMs: durationMs, maxMs: durationMs });
        return;
      }
      existing.count += 1;
      existing.totalMs += durationMs;
      existing.minMs = Math.min(existing.minMs, durationMs);
      existing.maxMs = Math.max(existing.maxMs, durationMs);
    },

    async time(name, fn, labels) {
      const start = now();
      try {
        return await fn();
      } finally {
        registry.observe(name, now() - start, labels);
      }
    },

    snapshot() {
      return {
        at: new Date(now()).toISOString(),
        counters: Object.fromEntries(counters),
        timers: Object.fromEntries(
          Array.from(timers.entries(), ([key, stats]) => [key, { ...stats }]),
        ),
      };
    },

    async flush(exporter) {
      const snap = registry.snapshot();
      await exporter.export(snap);
      registry.reset();
    },

    reset() {
      counters.clear();
      timers.clear();
    },
  };

  return registry;
}

// Process-wide singleton on globalThis (survives dev HMR / per-route module
// re-evaluation), mirroring lib/rate-limit.ts.
const globalScope = globalThis as typeof globalThis & { __noaMetrics?: MetricsRegistry };

/** The shared application registry used by instrumented modules. */
export function getMetrics(): MetricsRegistry {
  globalScope.__noaMetrics ??= createMetricsRegistry();
  return globalScope.__noaMetrics;
}
