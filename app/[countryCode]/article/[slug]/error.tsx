'use client'

import { useEffect } from 'react'

import { stripHtml } from '@/lib/search'

import type { WordPressPost } from '@/types/wp'

type ErrorWithStaleArticle = Error & {
  digest?: string
  staleArticle?: WordPressPost | null
  staleSourceCountry?: string | null
}

export default function ArticleError({
  error,
  reset,
}: {
  error: ErrorWithStaleArticle
  reset: () => void
}) {
  useEffect(() => {
    console.error('[v0] Article route error:', error)
  }, [error])

  const staleArticle = error?.staleArticle ?? null
  const headline = staleArticle?.title ? stripHtml(staleArticle.title) : null
  const summary = staleArticle?.excerpt ? stripHtml(staleArticle.excerpt) : null

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Temporarily unavailable</h1>
        <p className="text-base text-muted-foreground">
          We hit a temporary issue loading this story. Please try again in a moment.
        </p>
      </div>

      {staleArticle ? (
        <div className="w-full max-w-xl rounded-lg border border-border/70 bg-muted/40 p-5 text-left shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last available headline
            </p>
            <h2 className="text-lg font-semibold leading-tight">{headline || 'Untitled article'}</h2>
            {summary ? (
              <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>
            ) : null}
          </div>
        </div>
      ) : null}

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
