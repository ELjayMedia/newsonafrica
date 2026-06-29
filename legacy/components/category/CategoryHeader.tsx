import Link from "next/link"
import type { CategorySummary } from "@/lib/data/category"
import { cn } from "@/lib/utils"
import { Heading } from "@/components/ui/Heading"
import { Text } from "@/components/ui/Text"

interface CategoryHeaderProps {
  category: CategorySummary
  relatedCategories?: CategorySummary[]
  className?: string
}

export function CategoryHeader({ category, relatedCategories = [], className }: CategoryHeaderProps) {
  return (
    <header className={cn("space-y-6 rounded-3xl bg-background p-8 shadow-lg ring-1 ring-border/40", className)}>
      <div className="space-y-2 text-center md:text-left">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Category</p>
        <Heading level="h1" weight="semibold">{category.name}</Heading>
        {category.description && <Text size="base" color="muted">{category.description}</Text>}
        {typeof category.totalPosts === "number" && category.totalPosts > 0 && (
          <Text size="sm" color="muted">
            {category.totalPosts.toLocaleString()} articles
          </Text>
        )}
      </div>

      {relatedCategories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
          <Text size="xs" weight="semibold" color="muted" className="uppercase tracking-widest">Related</Text>
          {relatedCategories.map((related) => (
            <Link
              key={related.slug}
              href={related.href}
              className="rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary hover:bg-muted/40"
            >
              {related.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
