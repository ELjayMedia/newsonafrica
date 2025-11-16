'use client'

import { useEffect } from 'react'

import type { WordPressPost } from '@/types/wp'

import { ArticleUnavailableContent } from './ArticleUnavailableContent'

type ErrorWithStaleArticle = Error & {
  digest?: string
  staleArticle?: WordPressPost | null
  staleSourceCountry?: string | null
  failures?: Array<{ country?: string }>
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
  const failureCountries = error?.failures?.map((failure) => failure?.country).filter(Boolean) as
    | string[]
    | undefined

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <ArticleUnavailableContent
        staleArticle={staleArticle}
        digest={error?.digest ?? null}
        failureCountries={failureCountries}
      />

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
