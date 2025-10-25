export type FieldErrors = Record<string, string[]>

export class ValidationError extends Error {
  readonly fieldErrors: FieldErrors
  readonly statusCode: number

  constructor(message: string, fieldErrors: FieldErrors = {}, statusCode = 400) {
    super(message)
    this.name = "ValidationError"
    this.fieldErrors = fieldErrors
    this.statusCode = statusCode
  }
}

export function addValidationError(errors: FieldErrors, field: string, message: string) {
  if (!errors[field]) {
    errors[field] = []
  }
  errors[field]!.push(message)
}

export function hasValidationErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
