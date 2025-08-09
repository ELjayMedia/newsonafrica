import React from "react"
import Link from "next/link"

import { NewsGrid } from "@/components/NewsGrid"
import { HomeMidContentAd } from "@/components/HomeMidContentAd"
import type { CategoryConfig } from "@/config/homeConfig"

interface CategorySectionProps extends CategoryConfig {
  posts: any[]
}

export function CategorySection({ name, layout, typeOverride, showAdAfter, posts }: CategorySectionProps) {
  if (posts.length === 0) return null

  return (
    <React.Fragment>
      <section className="bg-white rounded-lg">
        <h2 className="text-lg md:text-xl font-bold capitalize mb-3">
          <Link href={`/category/${name.toLowerCase()}`} className="hover:text-blue-600 transition-colors">
            {name}
          </Link>
        </h2>
        <NewsGrid
          posts={posts.map((post) => ({
            ...post,
            type: typeOverride,
          }))}
          layout={layout}
          className="compact-grid"
        />
      </section>
      {showAdAfter && <HomeMidContentAd />}
    </React.Fragment>
  )
}
