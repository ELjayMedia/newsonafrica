'use client'

import { useEffect } from 'react'

export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[v0] Article route error:', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">We couldn't load this article</h1>
        <p className="text-muted-foreground">
          A temporary issue occurred while contacting our news servers. Please try again shortly.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/40 focus:ring-offset-2 focus:ring-offset-background"
      >
        Try again
      </button>
    </div>
  )
}
