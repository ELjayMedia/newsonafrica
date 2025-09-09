"use client"

import { AdSlot } from "./AdSlot"
import { HorizontalCard } from "./HorizontalCard"

import type { Post } from "@/types/content"

interface ReviveAdProps {
  className?: string
  categoryPosts?: Post[]
  zoneId: string
}

export function ReviveAd({ className = "", categoryPosts = [], zoneId }: ReviveAdProps) {
  return (
    <>
      <AdSlot zoneId={zoneId} className={className} />
      {categoryPosts.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryPosts.slice(0, 4).map((post) => (
            <HorizontalCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  )
}
