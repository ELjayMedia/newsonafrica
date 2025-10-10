export type ActionResult<TData, TError extends ActionError = ActionError> =
  | { data: TData; error: null }
  | { data: null; error: TError }

export interface ActionErrorOptions {
  status?: number
  code?: string
  cause?: unknown
}

export class ActionError extends Error {
  readonly status?: number
  readonly code?: string
  override readonly cause?: unknown

  constructor(message: string, options: ActionErrorOptions = {}) {
    super(message)
    this.name = "ActionError"
    this.status = options.status
    this.code = options.code
    this.cause = options.cause
  }
}

export function ensureActionError(error: unknown, fallbackMessage = "Unexpected error"): ActionError {
  if (error instanceof ActionError) {
    return error
  }

  if (error instanceof Error) {
    return new ActionError(error.message || fallbackMessage, { cause: error })
  }

  if (typeof error === "string") {
    return new ActionError(error)
  }

  return new ActionError(fallbackMessage, { cause: error })
}

export function actionSuccess<TData>(data: TData): ActionResult<TData> {
  return { data, error: null }
}

export function actionFailure<TData = never>(
  error: unknown,
  fallbackMessage?: string,
): ActionResult<TData> {
  return { data: null, error: ensureActionError(error, fallbackMessage) }
}
