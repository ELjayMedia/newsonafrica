"use client"

import { Button } from "@/components/ui/button"

interface GlobalErrorContentProps {
  reset: () => void
}

export function GlobalErrorContent({ reset }: GlobalErrorContentProps) {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="mb-4 text-2xl font-bold">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
