import "server-only"

import { categoryConfigs, type CategoryConfig } from "@/config/homeConfig"
import { CACHE_DURATIONS } from "@/lib/cache/constants"
import {
  AFRICAN_EDITION,
  type SupportedEdition,
} from "@/lib/editions"
import {
  buildHomeContentPropsForEditionUncached,
  buildHomeContentPropsUncached,
  type HomeContentServerProps,
} from "@/lib/home-builder"
import {
  readHomeSnapshot,
  writeHomeSnapshot,
  type HomeSnapshotRecord,
} from "@/lib/home-snapshot"
import type { CountryPosts, HomePost } from "@/types/home"

const FALLBACK_SNAPSHOT_TTL_SECONDS = CACHE_DURATIONS.VERY_LONG

const resolveCategorySlug = (config: CategoryConfig) => config.typeOverride ?? config.name

const mapCategoryPostsForConfigs = (
  configs: CategoryConfig[],
  categoryPostsBySlug: Record<string, HomePost[]>,
): HomeCategorySection[] =>
  configs.map((config) => {
    const resolvedSlug = resolveCategorySlug(config)
    const normalizedSlug = resolvedSlug.toLowerCase()
    const posts = categoryPostsBySlug[normalizedSlug] ?? categoryPostsBySlug[resolvedSlug] ?? []

    return {
      key: normalizedSlug,
      config,
      posts,
    }
  })

const buildFallbackData = (
  baselinePosts: HomePost[],
  featuredPosts: HomePost[],
): ResolvedInitialData => {
  if (baselinePosts.length === 0 && featuredPosts.length === 0) {
    return {
      taggedPosts: [],
      featuredPosts: [],
      categories: [],
      recentPosts: [],
      categoryPosts: {},
    }
  }

  const fallbackPosts = baselinePosts.length > 0 ? baselinePosts : featuredPosts

  return {
    taggedPosts: fallbackPosts.slice(0, 8),
    featuredPosts: featuredPosts.length > 0 ? featuredPosts.slice(0, 6) : fallbackPosts.slice(0, 6),
    categories: [],
    recentPosts: fallbackPosts.slice(0, 10),
    categoryPosts: {},
  }
}

const resolveInitialData = (
  initialData: HomeContentServerProps["initialData"],
  baselinePosts: HomePost[],
  featuredPosts: HomePost[],
): ResolvedInitialData => {
  if (!initialData) {
    return buildFallbackData(baselinePosts, featuredPosts)
  }

  const categoryPosts = initialData.categoryPosts ?? {}

  return {
    taggedPosts: initialData.taggedPosts ?? [],
    featuredPosts: initialData.featuredPosts ?? [],
    categories: initialData.categories ?? [],
    recentPosts: initialData.recentPosts ?? [],
    categoryPosts,
  }
}

export type HomeContentState = "empty" | "awaiting-hero" | "ready"

export interface HomeCategorySection {
  key: string
  config: CategoryConfig
  posts: HomePost[]
}

export interface HomeContentPayload {
  hero: HomePost | null
  secondaryStories: HomePost[]
  featuredPosts: HomePost[]
  categorySections: HomeCategorySection[]
  countryPosts: CountryPosts
  contentState: HomeContentState
}

interface ResolvedInitialData {
  taggedPosts: HomePost[]
  featuredPosts: HomePost[]
  categories: any[]
  recentPosts: HomePost[]
  categoryPosts: Record<string, HomePost[]>
}

export const selectHeroAndSecondary = (
  taggedPosts: HomePost[],
  featuredPosts: HomePost[],
  fallbackFeatured: HomePost[],
  recentPosts: HomePost[],
): { hero: HomePost | null; secondaryStories: HomePost[]; heroSource: HomePost[] } => {
  const primarySource = taggedPosts.length > 0 ? taggedPosts : fallbackFeatured.length > 0 ? fallbackFeatured : recentPosts
  const hero = primarySource[0] ?? null
  const secondaryStories = primarySource.slice(1, 5)

  return { hero, secondaryStories, heroSource: primarySource }
}

const determineContentState = (
  hero: HomePost | null,
  secondaryStories: HomePost[],
  featuredPosts: HomePost[],
  categorySections: HomeCategorySection[],
  heroSource: HomePost[],
): HomeContentState => {
  const hasCategoryPosts = categorySections.some((section) => section.posts.length > 0)
  const hasFeatured = featuredPosts.length > 0
  const hasContent = Boolean(hero) || secondaryStories.length > 0 || hasFeatured || hasCategoryPosts

  if (!hasContent) {
    return "empty"
  }

  if (!hero && heroSource.length === 0) {
    return "awaiting-hero"
  }

  return "ready"
}

const buildHomeContentPayload = (props: HomeContentServerProps): HomeContentPayload => {
  const baselinePosts = props.initialPosts ?? []
  const resolvedInitialData = resolveInitialData(props.initialData, baselinePosts, props.featuredPosts)
  const categorySections = mapCategoryPostsForConfigs(categoryConfigs, resolvedInitialData.categoryPosts)

  const finalFeaturedPosts = props.featuredPosts.length > 0 ? props.featuredPosts : resolvedInitialData.featuredPosts
  const { hero, secondaryStories, heroSource } = selectHeroAndSecondary(
    resolvedInitialData.taggedPosts,
    props.featuredPosts,
    finalFeaturedPosts,
    resolvedInitialData.recentPosts,
  )

  const contentState = determineContentState(hero, secondaryStories, finalFeaturedPosts, categorySections, heroSource)

  return {
    hero,
    secondaryStories,
    featuredPosts: finalFeaturedPosts,
    categorySections,
    countryPosts: props.countryPosts ?? {},
    contentState,
  }
}

async function buildSnapshotFallback(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeSnapshotRecord> {
  const startedAt = Date.now()
  const data =
    edition.code === AFRICAN_EDITION.code
      ? await buildHomeContentPropsUncached(baseUrl)
      : await buildHomeContentPropsForEditionUncached(baseUrl, edition)

  const durationMs = Date.now() - startedAt

  const record: HomeSnapshotRecord = {
    edition: edition.code,
    data,
    metadata: {
      builtAt: new Date().toISOString(),
      buildDurationMs: durationMs,
      ttfbMs: durationMs,
      source: "fallback",
    },
  }

  await writeHomeSnapshot(edition.code, record, { ttlSeconds: FALLBACK_SNAPSHOT_TTL_SECONDS })
  return record
}

async function loadSnapshotOrFallback(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeSnapshotRecord> {
  const existing = await readHomeSnapshot(edition.code)
  if (existing) {
    return existing
  }

  console.warn(`Missing home snapshot for ${edition.code}, rebuilding on-demand`)
  return buildSnapshotFallback(baseUrl, edition)
}

export async function getHomeContentSnapshot(baseUrl: string): Promise<HomeContentPayload> {
  const snapshot = await loadSnapshotOrFallback(baseUrl, AFRICAN_EDITION)
  return buildHomeContentPayload(snapshot.data)
}

export async function getHomeContentSnapshotForEdition(
  baseUrl: string,
  edition: SupportedEdition,
): Promise<HomeContentPayload> {
  const snapshot = await loadSnapshotOrFallback(baseUrl, edition)
  return buildHomeContentPayload(snapshot.data)
}

export type { HomeContentServerProps }
