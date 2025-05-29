/**
 * Advanced search indexing for improved performance
 * Updated with better error handling and performance optimizations
 */

interface SearchIndex {
  id: string
  title: string
  excerpt: string
  content: string
  slug: string
  date: string
  categories: string[]
  tags: string[]
  author: string
  searchableText: string
  keywords: string[]
  popularity: number
  lastModified: number
}

interface IndexStats {
  totalPosts: number
  lastUpdated: Date
  indexSize: number
  averageKeywords: number
  memoryUsage: number
}

interface SearchOptions {
  limit?: number
  categories?: string[]
  tags?: string[]
  sortBy?: "relevance" | "date" | "popularity"
  fuzzy?: boolean
}

class SearchIndexer {
  private index: Map<string, SearchIndex> = new Map()
  private keywordIndex: Map<string, Set<string>> = new Map()
  private categoryIndex: Map<string, Set<string>> = new Map()
  private lastUpdate: Date = new Date(0)
  private readonly UPDATE_INTERVAL = 30 * 60 * 1000 // 30 minutes
  private isBuilding = false

  /**
   * Build or update the search index with improved performance
   */
  async buildIndex(posts: any[]): Promise<void> {
    if (this.isBuilding) {
      console.log("Index build already in progress...")
      return
    }

    this.isBuilding = true

    try {
      console.log(`Building search index for ${posts.length} posts...`)
      const startTime = Date.now()

      // Clear existing indexes
      this.index.clear()
      this.keywordIndex.clear()
      this.categoryIndex.clear()

      // Process posts in batches for better performance
      const batchSize = 50
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize)
        await this.processBatch(batch)

        // Allow other operations to run
        if (i % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      this.lastUpdate = new Date()
      const buildTime = Date.now() - startTime
      console.log(`Search index built with ${this.index.size} entries in ${buildTime}ms`)
    } catch (error) {
      console.error("Error building search index:", error)
    } finally {
      this.isBuilding = false
    }
  }

  /**
   * Process a batch of posts
   */
  private async processBatch(posts: any[]): Promise<void> {
    posts.forEach((post) => {
      try {
        const indexEntry = this.createIndexEntry(post)
        this.index.set(indexEntry.id, indexEntry)
        this.updateKeywordIndex(indexEntry)
        this.updateCategoryIndex(indexEntry)
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
      }
    })
  }

  /**
   * Create a search index entry for a post
   */
  private createIndexEntry(post: any): SearchIndex {
    const title = this.cleanText(post.title?.rendered || post.title || "")
    const excerpt = this.cleanText(this.stripHtml(post.excerpt?.rendered || post.excerpt || ""))
    const content = this.cleanText(this.stripHtml(post.content?.rendered || post.content || ""))

    // Extract categories and tags with better error handling
    const categories = this.extractCategories(post)
    const tags = this.extractTags(post)

    // Create searchable text
    const searchableText = [title, excerpt, content, ...categories, ...tags].filter(Boolean).join(" ").toLowerCase()

    // Extract keywords with improved algorithm
    const keywords = this.extractKeywords(searchableText)

    // Calculate popularity score
    const popularity = this.calculatePopularity(post)

    return {
      id: post.id?.toString() || `temp-${Date.now()}`,
      title,
      excerpt,
      content,
      slug: post.slug || "",
      date: post.date || new Date().toISOString(),
      categories,
      tags,
      author: this.extractAuthor(post),
      searchableText,
      keywords,
      popularity,
      lastModified: Date.now(),
    }
  }

  /**
   * Extract categories with better error handling
   */
  private extractCategories(post: any): string[] {
    try {
      return (
        post.categories?.nodes?.map((cat: any) => cat.name) ||
        post._embedded?.["wp:term"]?.[0]?.map((cat: any) => cat.name) ||
        post.categories?.map((id: number) => `category-${id}`) ||
        []
      ).filter(Boolean)
    } catch {
      return []
    }
  }

  /**
   * Extract tags with better error handling
   */
  private extractTags(post: any): string[] {
    try {
      return (
        post.tags?.nodes?.map((tag: any) => tag.name) ||
        post._embedded?.["wp:term"]?.[1]?.map((tag: any) => tag.name) ||
        post.tags?.map((id: number) => `tag-${id}`) ||
        []
      ).filter(Boolean)
    } catch {
      return []
    }
  }

  /**
   * Extract author with better error handling
   */
  private extractAuthor(post: any): string {
    try {
      return post.author?.node?.name || post._embedded?.["author"]?.[0]?.name || post.author?.name || "Unknown"
    } catch {
      return "Unknown"
    }
  }

  /**
   * Update keyword index for fast lookups
   */
  private updateKeywordIndex(entry: SearchIndex): void {
    entry.keywords.forEach((keyword) => {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set())
      }
      this.keywordIndex.get(keyword)!.add(entry.id)
    })
  }

  /**
   * Update category index for fast filtering
   */
  private updateCategoryIndex(entry: SearchIndex): void {
    entry.categories.forEach((category) => {
      const categoryKey = category.toLowerCase()
      if (!this.categoryIndex.has(categoryKey)) {
        this.categoryIndex.set(categoryKey, new Set())
      }
      this.categoryIndex.get(categoryKey)!.add(entry.id)
    })
  }

  /**
   * Extract keywords with improved algorithm
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
      "my",
      "your",
      "his",
      "her",
      "its",
      "our",
      "their",
      "mine",
      "yours",
      "hers",
      "ours",
      "theirs",
      "myself",
      "yourself",
      "himself",
      "herself",
      "itself",
      "ourselves",
      "yourselves",
      "themselves",
    ])

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .reduce((unique, word) => {
        if (!unique.includes(word)) {
          unique.push(word)
        }
        return unique
      }, [] as string[])
      .slice(0, 50) // Limit keywords per post
  }

  /**
   * Calculate popularity score with improved algorithm
   */
  private calculatePopularity(post: any): number {
    let score = 0

    // Recency bonus (more sophisticated)
    const publishDate = new Date(post.date || Date.now())
    const daysSincePublished = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSincePublished < 1) score += 15
    else if (daysSincePublished < 3) score += 10
    else if (daysSincePublished < 7) score += 7
    else if (daysSincePublished < 30) score += 3
    else if (daysSincePublished < 90) score += 1

    // Category bonus
    const categories = this.extractCategories(post)
    const highPriorityCategories = ["news", "breaking", "featured", "trending", "politics", "business"]
    if (categories.some((cat) => highPriorityCategories.includes(cat.toLowerCase()))) {
      score += 5
    }

    // Content length bonus (longer articles might be more valuable)
    const contentLength = (post.content?.rendered || post.content || "").length
    if (contentLength > 2000) score += 3
    else if (contentLength > 1000) score += 2
    else if (contentLength > 500) score += 1

    // Featured image bonus
    if (post.featured_media || post._embedded?.["wp:featuredmedia"]?.[0]) {
      score += 2
    }

    return Math.max(0, score)
  }

  /**
   * Search with improved fuzzy matching and scoring
   */
  search(query: string, options: SearchOptions = {}): SearchIndex[] {
    const { limit = 20, categories = [], tags = [], sortBy = "relevance", fuzzy = true } = options

    if (!query || query.trim().length < 2) {
      return []
    }

    const queryTerms = this.normalizeQuery(query.trim())
    const results: Array<{ entry: SearchIndex; score: number }> = []

    // Fast category filtering using category index
    let candidateIds: Set<string> | null = null
    if (categories.length > 0) {
      candidateIds = new Set()
      categories.forEach((category) => {
        const categoryKey = category.toLowerCase()
        const ids = this.categoryIndex.get(categoryKey)
        if (ids) {
          ids.forEach((id) => candidateIds!.add(id))
        }
      })
    }

    // Search through index
    for (const entry of this.index.values()) {
      // Skip if not in category filter
      if (candidateIds && !candidateIds.has(entry.id)) {
        continue
      }

      // Apply tag filter
      if (
        tags.length > 0 &&
        !tags.some((tag) => entry.tags.some((entryTag) => entryTag.toLowerCase().includes(tag.toLowerCase())))
      ) {
        continue
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(entry, queryTerms, fuzzy)

      if (score > 0) {
        results.push({ entry, score })
      }
    }

    // Sort results
    this.sortResults(results, sortBy)

    return results.slice(0, limit).map((result) => result.entry)
  }

  /**
   * Normalize query for better matching
   */
  private normalizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 1)
  }

  /**
   * Calculate relevance score with improved algorithm
   */
  private calculateRelevanceScore(entry: SearchIndex, queryTerms: string[], fuzzy: boolean): number {
    let score = 0
    const titleLower = entry.title.toLowerCase()
    const excerptLower = entry.excerpt.toLowerCase()
    const contentLower = entry.content.toLowerCase()

    queryTerms.forEach((term) => {
      // Exact matches (highest priority)
      if (titleLower.includes(term)) {
        score += 25
        if (titleLower.startsWith(term)) score += 15 // Title starts with term
        if (titleLower === term) score += 20 // Exact title match
      }

      if (excerptLower.includes(term)) {
        score += 15
      }

      if (contentLower.includes(term)) {
        score += 8
      }

      // Category and tag matches
      entry.categories.forEach((category) => {
        if (category.toLowerCase().includes(term)) score += 12
      })

      entry.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(term)) score += 10
      })

      // Keyword matches
      if (entry.keywords.includes(term)) {
        score += 6
      }

      // Author match
      if (entry.author.toLowerCase().includes(term)) {
        score += 5
      }

      // Fuzzy matching for typos
      if (fuzzy) {
        score += this.calculateFuzzyScore(term, entry)
      }
    })

    // Add popularity bonus
    score += entry.popularity

    // Boost recent content slightly
    const daysSinceModified = (Date.now() - entry.lastModified) / (1000 * 60 * 60 * 24)
    if (daysSinceModified < 1) score += 2

    return score
  }

  /**
   * Calculate fuzzy matching score for typos and partial matches
   */
  private calculateFuzzyScore(term: string, entry: SearchIndex): number {
    let fuzzyScore = 0
    const threshold = 0.8 // Similarity threshold

    // Check title words for fuzzy matches
    const titleWords = entry.title.toLowerCase().split(/\s+/)
    titleWords.forEach((word) => {
      const similarity = this.calculateSimilarity(term, word)
      if (similarity > threshold) {
        fuzzyScore += Math.round(similarity * 5)
      }
    })

    // Check keywords for fuzzy matches
    entry.keywords.forEach((keyword) => {
      const similarity = this.calculateSimilarity(term, keyword)
      if (similarity > threshold) {
        fuzzyScore += Math.round(similarity * 3)
      }
    })

    return fuzzyScore
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    const matrix = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(null))

    for (let i = 0; i <= len1; i++) matrix[0][i] = i
    for (let j = 0; j <= len2; j++) matrix[j][0] = j

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + cost, // substitution
        )
      }
    }

    const maxLen = Math.max(len1, len2)
    return (maxLen - matrix[len2][len1]) / maxLen
  }

  /**
   * Sort results based on criteria
   */
  private sortResults(results: Array<{ entry: SearchIndex; score: number }>, sortBy: string): void {
    results.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime()
        case "popularity":
          return b.entry.popularity - a.entry.popularity
        default: // relevance
          return b.score - a.score
      }
    })
  }

  /**
   * Get search suggestions with improved algorithm
   */
  getSuggestions(query: string, limit = 8): string[] {
    const queryLower = query.toLowerCase()
    const suggestions = new Map<string, number>() // suggestion -> score

    // Get suggestions from keywords
    for (const [keyword, postIds] of this.keywordIndex.entries()) {
      if (keyword.includes(queryLower) && keyword !== queryLower) {
        const score = postIds.size * (keyword.startsWith(queryLower) ? 2 : 1)
        suggestions.set(keyword, score)
      }
    }

    // Get suggestions from titles
    for (const entry of this.index.values()) {
      const titleWords = entry.title.toLowerCase().split(/\s+/)
      titleWords.forEach((word) => {
        if (word.includes(queryLower) && word !== queryLower && word.length > 2) {
          const score = (suggestions.get(word) || 0) + entry.popularity
          suggestions.set(word, score)
        }
      })
    }

    // Get suggestions from categories
    for (const [category, postIds] of this.categoryIndex.entries()) {
      if (category.includes(queryLower) && category !== queryLower) {
        const score = postIds.size * 1.5
        suggestions.set(category, score)
      }
    }

    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([suggestion]) => suggestion)
  }

  /**
   * Check if index needs update
   */
  needsUpdate(): boolean {
    return (Date.now() - this.lastUpdate.getTime() > this.UPDATE_INTERVAL || this.index.size === 0) && !this.isBuilding
  }

  /**
   * Get comprehensive index statistics
   */
  getStats(): IndexStats {
    const totalKeywords = Array.from(this.index.values()).reduce((sum, entry) => sum + entry.keywords.length, 0)

    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage()

    return {
      totalPosts: this.index.size,
      lastUpdated: this.lastUpdate,
      indexSize: this.keywordIndex.size,
      averageKeywords: this.index.size > 0 ? Math.round(totalKeywords / this.index.size) : 0,
      memoryUsage,
    }
  }

  /**
   * Estimate memory usage of the index
   */
  private estimateMemoryUsage(): number {
    let size = 0

    // Estimate index size
    for (const entry of this.index.values()) {
      size += JSON.stringify(entry).length * 2 // Rough estimate
    }

    // Estimate keyword index size
    for (const [key, value] of this.keywordIndex.entries()) {
      size += key.length * 2 + value.size * 10
    }

    return Math.round(size / 1024) // Return in KB
  }

  /**
   * Clean text by removing extra whitespace and normalizing
   */
  private cleanText(text: string): string {
    return text.replace(/\s+/g, " ").trim()
  }

  /**
   * Strip HTML tags with improved regex
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim()
  }

  /**
   * Clear the index and free memory
   */
  clear(): void {
    this.index.clear()
    this.keywordIndex.clear()
    this.categoryIndex.clear()
    this.lastUpdate = new Date(0)
    this.isBuilding = false
  }

  /**
   * Get index health status
   */
  getHealthStatus(): { status: string; issues: string[] } {
    const issues: string[] = []

    if (this.index.size === 0) {
      issues.push("Index is empty")
    }

    if (Date.now() - this.lastUpdate.getTime() > this.UPDATE_INTERVAL * 2) {
      issues.push("Index is outdated")
    }

    if (this.estimateMemoryUsage() > 10000) {
      // 10MB
      issues.push("High memory usage")
    }

    const status = issues.length === 0 ? "healthy" : "warning"

    return { status, issues }
  }
}

// Export singleton instance
export const searchIndexer = new SearchIndexer()

// Export types
export type { SearchIndex, IndexStats, SearchOptions }
