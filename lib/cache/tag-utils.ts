export interface BuildCacheTagsParams {
  country?: string | null
  section?: string | null
  extra?: Array<string | null | undefined | false>
}

export function buildCacheTags({ country, section, extra = [] }: BuildCacheTagsParams): string[] {
  const tags = new Set<string>()

  if (country) {
    tags.add(`country:${country}`)
  }

  if (section) {
    tags.add(`section:${section}`)
  }

  for (const value of extra) {
    if (typeof value === "string" && value.trim()) {
      tags.add(value)
    }
  }

  return Array.from(tags)
}
