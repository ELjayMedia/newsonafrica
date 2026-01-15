export class PostgRESTError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details: string | null,
    public hint: string | null,
    public status: number,
  ) {
    super(message)
    this.name = "PostgRESTError"
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new PostgRESTError(
      error.code ?? "UNKNOWN",
      error.message ?? res.statusText,
      error.details ?? null,
      error.hint ?? null,
      res.status,
    )
  }

  if (res.status === 204) {
    return null as T
  }

  return res.json() as Promise<T>
}
