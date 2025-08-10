"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type MostReadItem = {
  slug: string
  title: string
}

export default function MostRead({
  limit = 5,
  className = "",
  title = "Most Read",
}: {
  limit?: number
  className?: string
  title?: string
}) {
  const [items, setItems] = useState<MostReadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/most-read?limit=${encodeURIComponent(limit)}`, {
          signal: controller.signal,
          headers: { "x-requested-with": "most-read" },
        })
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
        const json = (await res.json()) as { items: MostReadItem[] }
        setItems((json.items || []).slice(0, limit))
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError("Unable to load most read right now.")
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [limit])

  return (
    <Card className={className}>
      <CardHeader className="py-3 border-b">
        <div className="flex flex-col">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{title}</CardTitle>
          <div className="mt-2 h-[3px] w-10 rounded bg-blue-600" />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <ol className="space-y-5" aria-label="Loading most read headlines">
            {Array.from({ length: limit }).map((_, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="select-none text-2xl font-extrabold leading-none text-gray-300" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <Skeleton className="h-4 w-[92%] max-w-[280px]" />
                </div>
              </li>
            ))}
          </ol>
        ) : error ? (
          <div role="status" className="text-sm text-red-600">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-neutral-500">No popular articles yet.</div>
        ) : (
          <ol className="space-y-5" aria-label="Most read headlines">
            {items.slice(0, limit).map((item, idx) => (
              <li key={item.slug} className="flex items-start gap-4">
                <span className="select-none text-2xl font-extrabold leading-none text-gray-300" aria-hidden="true">
                  {idx + 1}
                </span>
                <Link
                  href={`/post/${encodeURIComponent(item.slug)}`}
                  className="flex-1 text-[15px] font-semibold leading-6 text-slate-900 hover:underline focus:underline focus:outline-none"
                  data-rank={idx + 1}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
