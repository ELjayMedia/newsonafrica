#!/usr/bin/env node
/**
 * Backfill Search Index Script
 *
 * Syncs existing WordPress posts to the Supabase search index.
 * Run this after deploying the search migration or to repair sync issues.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-search-index.ts [--country=sz] [--limit=100] [--offset=0]
 */

import { createClient } from "@supabase/supabase-js"
import { stripHtml } from "../lib/search"
import { SUPPORTED_COUNTRIES } from "../lib/editions"
import { searchWordPressPosts } from "../lib/wordpress-search"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface BackfillOptions {
  country?: string
  limit?: number
  offset?: number
  daysBack?: number
}

async function backfillCountry(countryCode: string, options: BackfillOptions = {}) {
  const { limit = 100, offset = 0, daysBack = 30 } = options

  console.log(`\n📊 Backfilling ${countryCode.toUpperCase()} (limit: ${limit}, offset: ${offset})`)

  let page = Math.floor(offset / limit) + 1
  let totalSynced = 0
  let hasMore = true

  while (hasMore && totalSynced < limit) {
    console.log(`\n  Fetching page ${page}...`)

    const response = await searchWordPressPosts("*", {
      country: countryCode,
      page,
      perPage: Math.min(100, limit - totalSynced),
      orderBy: "date",
      order: "desc",
    })

    if (response.results.length === 0) {
      console.log(`  No more posts found`)
      break
    }

    console.log(`  Found ${response.results.length} posts`)

    for (const post of response.results) {
      const wpPostId = post.databaseId || Number.parseInt(post.id || "0", 10)
      if (!wpPostId) {
        console.warn(`  ⚠️  Skipping post with no ID: ${post.slug}`)
        continue
      }

      const title = stripHtml(post.title || "Untitled")
      const excerpt = stripHtml(post.excerpt || "")
      const content = stripHtml(post.content || "").slice(0, 5000)
      const categories = post.categories?.nodes?.map((c) => c?.name).filter(Boolean) || []
      const tags = post.tags?.nodes?.map((t) => t?.name).filter(Boolean) || []
      const author = post.author?.node?.name || ""
      const publishedAt = post.date || new Date().toISOString()
      const featuredImageUrl = post.featuredImage?.node?.sourceUrl || null
      const urlPath = `/${countryCode}/article/${post.slug}`

      const { error } = await supabase.from("content_index").upsert(
        {
          edition_code: countryCode,
          wp_post_id: wpPostId,
          slug: post.slug,
          title,
          excerpt,
          content_plain: content,
          tags,
          categories,
          author,
          published_at: publishedAt,
          url_path: urlPath,
          featured_image_url: featuredImageUrl,
        },
        {
          onConflict: "edition_code,wp_post_id",
        },
      )

      if (error) {
        console.error(`  ❌ Error syncing post ${wpPostId}: ${error.message}`)
      } else {
        totalSynced++
        process.stdout.write(`  ✓ ${totalSynced}/${limit} synced\r`)
      }
    }

    hasMore = response.hasMore
    page++
  }

  console.log(`\n✅ Completed ${countryCode.toUpperCase()}: ${totalSynced} posts synced`)

  // Update sync cursor
  await supabase.from("content_sync_cursor").upsert({
    edition_code: countryCode,
    last_synced_at: new Date().toISOString(),
    sync_status: "completed",
  })
}

async function main() {
  const args = process.argv.slice(2)
  const options: BackfillOptions = {}

  for (const arg of args) {
    if (arg.startsWith("--country=")) {
      options.country = arg.split("=")[1]
    } else if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.split("=")[1], 10)
    } else if (arg.startsWith("--offset=")) {
      options.offset = Number.parseInt(arg.split("=")[1], 10)
    } else if (arg.startsWith("--days=")) {
      options.daysBack = Number.parseInt(arg.split("=")[1], 10)
    }
  }

  console.log("🔍 News On Africa - Search Index Backfill")
  console.log("=========================================")

  if (options.country) {
    await backfillCountry(options.country, options)
  } else {
    console.log(`\nBackfilling all countries: ${SUPPORTED_COUNTRIES.join(", ")}`)
    for (const country of SUPPORTED_COUNTRIES) {
      await backfillCountry(country, options)
    }
  }

  console.log("\n✨ Backfill complete!")
  process.exit(0)
}

main().catch((error) => {
  console.error("\n❌ Backfill failed:", error)
  process.exit(1)
})
