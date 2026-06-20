import type { HomePost } from "@/types/home"

export type HomeFeedSource = "frontpage" | "tagged" | "recent"

export interface HomeFeedCandidate {
  source: HomeFeedSource
  posts: HomePost[]
}

const SOURCE_WEIGHTS: Record<HomeFeedSource, number> = {
  frontpage: 1000,
  tagged: 500,
  recent: 0,
}

const scoreCandidate = (candidate: HomeFeedCandidate): number =>
  candidate.posts.length > 0 ? SOURCE_WEIGHTS[candidate.source] + candidate.posts.length : -1

export const selectBestHomeFeedCandidate = (
  candidates: Array<HomeFeedCandidate | null | undefined>,
): HomeFeedCandidate | null => {
  let best: HomeFeedCandidate | null = null
  let bestScore = -1

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const score = scoreCandidate(candidate)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best
}
