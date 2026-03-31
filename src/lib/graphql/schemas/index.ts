import type { ZodError } from "zod"
import { productionOperationSchemas } from "./production"

export interface GraphQLRouteContext {
  route: string
  surface?: string
}

export interface GraphQLValidationError {
  kind: "validation_error"
  operationName: string
  routeContext: GraphQLRouteContext
  phase: "variables" | "response"
  message: string
  issues: ZodError["issues"]
}

const UNKNOWN_OPERATION = "UnknownOperation"

export const extractGraphQLOperationName = (query: string): string => {
  const matched = query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)
  return matched?.[1] ?? UNKNOWN_OPERATION
}

export const getOperationValidationSchemas = (operationName: string) => {
  return productionOperationSchemas[operationName]
}
