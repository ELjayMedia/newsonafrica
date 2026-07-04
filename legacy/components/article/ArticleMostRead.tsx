import Link from "next/link"
import Image from "next/image"
import type { WordPressPost } from "@/types/wp"
import { cn } from "@/lib/utils"

interface ArticleMostReadProps {
  articles: WordPressPost[]
  countryCode?: string
  className?: string
}

export function ArticleMostRead({ articles, countryCode = "sz", className }: ArticleMostReadProps) {
  if (!articles || articles.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="border-b-2 border-[#e2001a] pb-2">
        <h2 className="text-lg font-bold text-foreground">Recent News</h2>
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/${countryCode}/article/${article.slug}`}
            className="block border-b border-border pb-3"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-[44px] w-[60px] flex-shrink-0 overflow-hidden rounded">
                <Image
                  src={article.featuredImage?.node?.sourceUrl ?? "/placeholder.svg?height=88&width=120"}
                  alt={article.title ?? "Article image"}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors hover:text-[#e2001a]">
                  {article.title}
                </h3>

                {article.date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(article.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Company Snapshot</h3>
        <input
          type="text"
          placeholder="Search company"
          className="w-full border border-border px-2 py-1 text-sm"
        />
        <div className="overflow-hidden border border-border text-sm">
          <div className="grid grid-cols-[1.4fr_1fr_.8fr_.7fr] bg-foreground px-2 py-1 text-xs font-semibold text-background">
            <span>Company</span>
            <span>Price</span>
            <span>Chg</span>
            <span>%</span>
          </div>
          {[
            { name: "Safaricom", price: "KES 21.45", change: "+0.35", pct: "+1.66%", positive: true },
            { name: "MTN Group", price: "ZAR 108.80", change: "-1.15", pct: "-1.05%", positive: false },
            { name: "Dangote", price: "NGN 648.20", change: "+4.80", pct: "+0.75%", positive: true },
          ].map((row) => (
            <div key={row.name} className="grid grid-cols-[1.4fr_1fr_.8fr_.7fr] border-t border-border px-2 py-1 text-xs">
              <span>{row.name}</span>
              <span>{row.price}</span>
              <span className={row.positive ? "text-green-600" : "text-red-600"}>{row.change}</span>
              <span className={row.positive ? "text-green-600" : "text-red-600"}>{row.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
