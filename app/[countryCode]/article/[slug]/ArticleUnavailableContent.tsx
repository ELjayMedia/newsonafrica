import { stripHtml } from "@/lib/search"
import type { WordPressPost } from "@/types/wp"

export type ArticleUnavailableContentProps = {
  staleArticle?: WordPressPost | null
  digest?: string | null
  failureCountries?: readonly string[] | null
}

export function ArticleUnavailableContent({
  staleArticle,
  digest,
  failureCountries,
}: ArticleUnavailableContentProps) {
  const headline = staleArticle?.title ? stripHtml(staleArticle.title) : null
  const summary = staleArticle?.excerpt ? stripHtml(staleArticle.excerpt) : null
  const failureMetadata = failureCountries?.length ? failureCountries.join(",") : null

  return (
    <div
      className="space-y-6 text-center"
      data-error-digest={digest ?? undefined}
      data-failure-countries={failureMetadata ?? undefined}
    >
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
            <h2 className="text-lg font-semibold leading-tight">{headline || "Untitled article"}</h2>
            {summary ? <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
