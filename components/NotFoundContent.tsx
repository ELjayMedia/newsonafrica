import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function NotFoundContent() {
  return (
    <section className="flex min-h-[60vh] w-full items-center justify-center py-16">
      <Empty className="max-w-2xl border border-dashed border-border/80 bg-muted/40 p-10">
        <EmptyHeader className="gap-4">
          <EmptyMedia variant="icon" className="rounded-full border border-border/60 bg-background px-6 py-3">
            <span className="text-4xl font-semibold tracking-tight">404</span>
          </EmptyMedia>
          <EmptyTitle className="text-foreground text-2xl font-semibold">Page not found</EmptyTitle>
          <EmptyDescription className="text-base">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild size="lg">
            <Link href="/">Return to homepage</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}
