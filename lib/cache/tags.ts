export interface CacheTagContext {
  country?: string
  sections?: string[]
  extraTags?: string[]
}

const normalize = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }
  const trimmed = value.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export function composeCacheTags({
  country,
  sections = [],
  extraTags = [],
}: CacheTagContext): string[] {
  const tags = new Set<string>()

  const normalizedCountry = normalize(country)
  if (normalizedCountry) {
    tags.add(`country:${normalizedCountry}`)
  }

  const normalizedSections = sections
    .map(normalize)
    .filter((section): section is string => Boolean(section))

  if (normalizedSections.length === 0) {
    tags.add("section:general")
  } else {
    normalizedSections.forEach((section) => {
      tags.add(`section:${section}`)
    })
  }

  extraTags
    .map(normalize)
    .filter((tag): tag is string => Boolean(tag))
    .forEach((tag) => tags.add(tag))

  return Array.from(tags)
}

export function composeCountrySectionTags(country: string, ...sections: string[]): string[] {
  return composeCacheTags({ country, sections })
}
