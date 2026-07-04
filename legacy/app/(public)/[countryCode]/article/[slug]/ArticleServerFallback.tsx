import type { WordPressPost } from "@/types/wp"

import { ArticleUnavailableContent } from "./ArticleUnavailableContent"

type ArticleServerFallbackProps = {
  staleArticle?: WordPressPost | null
  digest?: string | null
  failureCountries?: readonly string[] | null
}

export function ArticleServerFallback({
  staleArticle,
  digest,
  failureCountries,
}: ArticleServerFallbackProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <ArticleUnavailableContent
        staleArticle={staleArticle}
        digest={digest ?? null}
        failureCountries={failureCountries}
      />
    </main>
  )
}
