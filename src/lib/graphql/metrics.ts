import type { GraphQLClientErrorCategory } from "./client"

export type GraphQLOperationClass = "feed" | "detail" | "taxonomy" | "search" | "mutation" | "other"
export type GraphQLTelemetryStatus = "success" | "retry" | "error"

export interface GraphQLTelemetryEvent {
  operationName: string
  endpoint: string
  attempt: number
  maxAttempts: number
  durationMs: number
  status: GraphQLTelemetryStatus
  operationClass?: GraphQLOperationClass
  statusCode?: number
  category?: GraphQLClientErrorCategory
  payloadSizeEstimateBytes?: number
  retryCount?: number
  timestampMs?: number
}

export interface GraphQLOperationMetrics {
  operationName: string
  operationClass: GraphQLOperationClass
  totalExecutions: number
  totalErrors: number
  errorRate: number
  totalRetries: number
  avgRetriesPerExecution: number
  p95LatencyMs: number
  avgLatencyMs: number
  avgPayloadSizeEstimateBytes: number
  lastUpdatedAt: string
}

interface OperationAccumulator {
  operationName: string
  operationClass: GraphQLOperationClass
  totalExecutions: number
  totalErrors: number
  totalRetries: number
  latenciesMs: number[]
  totalPayloadBytes: number
  payloadSamples: number
  lastUpdatedAtMs: number
}

const DEFAULT_LATENCY_SAMPLE_SIZE = 250

const inferOperationClass = (operationName: string): GraphQLOperationClass => {
  const normalized = operationName.toLowerCase()

  if (normalized.startsWith("search_") || normalized.includes("search")) {
    return "search"
  }

  if (normalized.startsWith("taxonomy_") || normalized.includes("tag") || normalized.includes("categor")) {
    return "taxonomy"
  }

  if (normalized.includes("feed") || normalized.includes("latest") || normalized.includes("related")) {
    return "feed"
  }

  if (normalized.includes("slug") || normalized.includes("detail") || normalized.includes("profile")) {
    return "detail"
  }

  if (normalized.startsWith("mutation") || normalized.includes("update") || normalized.includes("create") || normalized.includes("delete")) {
    return "mutation"
  }

  return "other"
}

const computeP95 = (values: number[]): number => {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index] ?? 0
}

const avg = (total: number, count: number): number => (count > 0 ? total / count : 0)

export interface GraphQLTelemetryRecorder {
  record: (event: GraphQLTelemetryEvent) => void
  getOperationMetrics: (operationName: string) => GraphQLOperationMetrics | undefined
  getSnapshot: () => GraphQLOperationMetrics[]
  getTopFailingOperations: (limit?: number) => GraphQLOperationMetrics[]
  getTopSlowOperations: (limit?: number) => GraphQLOperationMetrics[]
  reset: () => void
}

export const createGraphQLTelemetryRecorder = (options?: {
  maxLatencySamplesPerOperation?: number
}): GraphQLTelemetryRecorder => {
  const maxLatencySamples = Math.max(10, options?.maxLatencySamplesPerOperation ?? DEFAULT_LATENCY_SAMPLE_SIZE)
  const operations = new Map<string, OperationAccumulator>()

  const toMetrics = (acc: OperationAccumulator): GraphQLOperationMetrics => {
    const latencyTotal = acc.latenciesMs.reduce((sum, value) => sum + value, 0)

    return {
      operationName: acc.operationName,
      operationClass: acc.operationClass,
      totalExecutions: acc.totalExecutions,
      totalErrors: acc.totalErrors,
      errorRate: avg(acc.totalErrors, acc.totalExecutions),
      totalRetries: acc.totalRetries,
      avgRetriesPerExecution: avg(acc.totalRetries, acc.totalExecutions),
      p95LatencyMs: computeP95(acc.latenciesMs),
      avgLatencyMs: avg(latencyTotal, acc.latenciesMs.length),
      avgPayloadSizeEstimateBytes: avg(acc.totalPayloadBytes, acc.payloadSamples),
      lastUpdatedAt: new Date(acc.lastUpdatedAtMs).toISOString(),
    }
  }

  const upsert = (operationName: string, operationClass: GraphQLOperationClass): OperationAccumulator => {
    const existing = operations.get(operationName)
    if (existing) {
      return existing
    }

    const created: OperationAccumulator = {
      operationName,
      operationClass,
      totalExecutions: 0,
      totalErrors: 0,
      totalRetries: 0,
      latenciesMs: [],
      totalPayloadBytes: 0,
      payloadSamples: 0,
      lastUpdatedAtMs: Date.now(),
    }

    operations.set(operationName, created)
    return created
  }

  return {
    record(event) {
      const operationName = event.operationName || "UnknownOperation"
      const operationClass = event.operationClass ?? inferOperationClass(operationName)
      const accumulator = upsert(operationName, operationClass)

      accumulator.operationClass = operationClass
      accumulator.lastUpdatedAtMs = event.timestampMs ?? Date.now()

      if (event.status === "retry") {
        accumulator.totalRetries += 1
        return
      }

      accumulator.totalExecutions += 1
      if (event.status === "error") {
        accumulator.totalErrors += 1
      }

      if (typeof event.retryCount === "number" && event.retryCount > 0) {
        accumulator.totalRetries += event.retryCount
      }

      if (typeof event.durationMs === "number" && Number.isFinite(event.durationMs)) {
        accumulator.latenciesMs.push(Math.max(0, event.durationMs))
        if (accumulator.latenciesMs.length > maxLatencySamples) {
          accumulator.latenciesMs.splice(0, accumulator.latenciesMs.length - maxLatencySamples)
        }
      }

      if (typeof event.payloadSizeEstimateBytes === "number" && Number.isFinite(event.payloadSizeEstimateBytes)) {
        accumulator.totalPayloadBytes += Math.max(0, event.payloadSizeEstimateBytes)
        accumulator.payloadSamples += 1
      }
    },

    getOperationMetrics(operationName) {
      const accumulator = operations.get(operationName)
      return accumulator ? toMetrics(accumulator) : undefined
    },

    getSnapshot() {
      return Array.from(operations.values(), (accumulator) => toMetrics(accumulator)).sort((a, b) => a.operationName.localeCompare(b.operationName))
    },

    getTopFailingOperations(limit = 5) {
      return this.getSnapshot()
        .filter((metrics) => metrics.totalExecutions > 0)
        .sort((a, b) => {
          if (b.errorRate !== a.errorRate) {
            return b.errorRate - a.errorRate
          }
          return b.totalErrors - a.totalErrors
        })
        .slice(0, Math.max(1, limit))
    },

    getTopSlowOperations(limit = 5) {
      return this.getSnapshot()
        .filter((metrics) => metrics.totalExecutions > 0)
        .sort((a, b) => b.p95LatencyMs - a.p95LatencyMs)
        .slice(0, Math.max(1, limit))
    },

    reset() {
      operations.clear()
    },
  }
}
