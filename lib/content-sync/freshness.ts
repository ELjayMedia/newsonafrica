export type ContentFreshnessStatus = "fresh" | "stale" | "empty" | "source-unavailable";

export interface LatestContentRef {
  wpPostId: number;
  publishedAt: string;
}

export interface ContentFreshnessAssessment {
  status: ContentFreshnessStatus;
  reason: string;
}

function validTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Compare the newest published WordPress post with the newest indexed row.
 *
 * A historically successful backfill is not evidence of current health. The
 * mirror is only "fresh" when its latest post identity matches the source.
 */
export function assessContentFreshness(
  latestWordPress: LatestContentRef | null,
  latestIndexed: LatestContentRef | null,
  sourceError?: string | null,
): ContentFreshnessAssessment {
  if (sourceError) {
    return {
      status: "source-unavailable",
      reason: `WordPress source check failed: ${sourceError}`,
    };
  }

  if (!latestWordPress && !latestIndexed) {
    return { status: "empty", reason: "Source and index contain no published posts." };
  }

  if (!latestWordPress && latestIndexed) {
    return {
      status: "stale",
      reason: "Index contains content while WordPress returned no published posts.",
    };
  }

  if (latestWordPress && !latestIndexed) {
    return {
      status: "stale",
      reason: `WordPress latest post ${latestWordPress.wpPostId} is missing from the index.`,
    };
  }

  if (!latestWordPress || !latestIndexed) {
    return { status: "stale", reason: "Source/index freshness could not be reconciled." };
  }

  if (latestWordPress.wpPostId !== latestIndexed.wpPostId) {
    return {
      status: "stale",
      reason: `Latest post mismatch: WordPress=${latestWordPress.wpPostId}, index=${latestIndexed.wpPostId}.`,
    };
  }

  const sourcePublishedAt = validTimestamp(latestWordPress.publishedAt);
  const indexedPublishedAt = validTimestamp(latestIndexed.publishedAt);

  if (
    sourcePublishedAt !== null &&
    indexedPublishedAt !== null &&
    sourcePublishedAt > indexedPublishedAt
  ) {
    return {
      status: "stale",
      reason: "The latest WordPress publication timestamp is newer than the indexed copy.",
    };
  }

  return {
    status: "fresh",
    reason: `Latest WordPress post ${latestWordPress.wpPostId} is present in the index.`,
  };
}
