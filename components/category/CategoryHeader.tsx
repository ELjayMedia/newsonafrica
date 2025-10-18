import Link from "next/link"
import type { CategorySummary } from "@/lib/data/category"
import { cn } from "@/lib/utils"

interface CategoryHeaderProps {
  category: CategorySummary
  relatedCategories?: CategorySummary[]
  className?: string
}

export function CategoryHeader({ category, relatedCategories = [], className }: CategoryHeaderProps) {
  return (
    <header className={cn("space-y-6 rounded-3xl bg-background p-8 shadow-lg ring-1 ring-border/40", className)}>
      <div className="space-y-2 text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Category</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{category.name}</h1>
        {category.description && <p className="text-base text-muted-foreground md:text-lg">{category.description}</p>}
        {typeof category.totalPosts === "number" && category.totalPosts > 0 && (
          <p className="text-sm text-muted-foreground">
            {category.totalPosts.toLocaleString()} articles
          </p>
        )}
      </div>

      {relatedCategories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Related</span>
          {relatedCategories.map((related) => (
            <Link
              key={related.slug}
              href={related.href}
              className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              {related.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
