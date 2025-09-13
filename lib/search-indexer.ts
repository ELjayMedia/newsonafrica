import { siteConfig } from "@/config/site"
import logger from '@/utils/logger'

interface IndexedPost {
  id: string
  title: string
  excerpt: string
  content: string
  slug: string
  date: string
  categories: number[]
  tags: number[]
  author: number
  searchText: string
  popularity: number
  wordCount: number
  readingTime: number
}

interface SearchIndex {
  posts: Map<string, IndexedPost>
  titleIndex: Map<string, Set<string>>
  contentIndex: Map<string, Set<string>>
  categoryIndex: Map<number, Set<string>>
  tagIndex: Map<number, Set<string>>
  bigramIndex: Map<string, Set<string>>
  trigramIndex: Map<string, Set<string>>
  lastUpdated: number
  version: number
}

interface SearchOptions {
  limit?: number
  categories?: string[]
  tags?: string[]
  sortBy?: "relevance" | "date" | "popularity" | "reading_time"
  fuzzy?: boolean
  minScore?: number
  boostRecent?: boolean
}

export interface SearchDocument {
  id: string
  title: string
  content: string
  excerpt: string
  slug: string
  date: string
  categories: string[]
  tags: string[]
  author: string
  featured_media_url?: string
}

// Fine-tuned configuration
const SEARCH_CONFIG = {
  // Index update intervals based on content freshness
  UPDATE_INTERVALS: {
    PEAK_HOURS: 5 * 60 * 1000, // 5 minutes during peak hours (9-17)
    OFF_PEAK: 15 * 60 * 1000, // 15 minutes during off-peak
    NIGHT: 30 * 60 * 1000, // 30 minutes during night (22-6)
  },

  // Word processing parameters
  WORD_PROCESSING: {
    MIN_WORD_LENGTH: 2, // Reduced from 3 for better coverage
    MAX_WORD_LENGTH: 50, // Prevent extremely long words
    MAX_WORDS_PER_POST: 1000, // Limit indexing for performance
  },

  // Scoring weights
  SCORING: {
    TITLE_EXACT_MATCH: 25,
    TITLE_PARTIAL_MATCH: 15,
    TITLE_FUZZY_MATCH: 8,
    CONTENT_EXACT_MATCH: 5,
    CONTENT_PARTIAL_MATCH: 3,
    CONTENT_FUZZY_MATCH: 1,
    CATEGORY_MATCH: 12,
    TAG_MATCH: 8,
    BIGRAM_MATCH: 6,
    TRIGRAM_MATCH: 4,
    RECENCY_BONUS_MAX: 10,
    POPULARITY_MULTIPLIER: 1.5,
    READING_TIME_BONUS: 2,
  },

  // Performance thresholds
  PERFORMANCE: {
    MAX_SEARCH_TIME: 100, // 100ms target
    MAX_INDEX_BUILD_TIME: 5000, // 5 seconds max
    BATCH_SIZE: 25, // Reduced for better responsiveness
    MAX_SUGGESTIONS: 12,
    MIN_SCORE_THRESHOLD: 2,
  },

  // Memory management
  MEMORY: {
    MAX_INDEX_SIZE_MB: 50,
    CLEANUP_THRESHOLD: 0.8, // Clean when 80% full
    GC_INTERVAL: 60 * 1000, // 1 minute
  },
}

// Enhanced stop words with African context
const STOP_WORDS = new Set([
  // English stop words
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
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "where",
  "when",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "now",
  "here",
  "there",
  "then",
  "once",
  "also",
  "back",
  "even",
  "still",
  "way",

  // Common African language stop words (basic set)
  "na",
  "ya",
  "wa",
  "ka",
  "sa",
  "la",
  "ma",
  "ba",
  "da",
  "ga",
  "ha",
  "ja",
  "fa",
  "ra",
  "ta",
  "za",

  // News-specific stop words
  "said",
  "says",
  "according",
  "reported",
  "news",
  "today",
  "yesterday",
  "tomorrow",
  "breaking",
  "update",
  "latest",
  "recent",
  "new",
  "old",
  "first",
  "last",
  "next",
  "previous",
])

export class SearchIndexer {
  private index: SearchIndex = {
    posts: new Map(),
    titleIndex: new Map(),
    contentIndex: new Map(),
    categoryIndex: new Map(),
    tagIndex: new Map(),
    bigramIndex: new Map(),
    trigramIndex: new Map(),
    lastUpdated: 0,
    version: 1,
  }

  private gcTimer: NodeJS.Timeout | null = null
  private isBuilding = false
  private buildQueue: any[] = []

  constructor() {
    this.startGarbageCollection()
  }

  private startGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection()
    }, SEARCH_CONFIG.MEMORY.GC_INTERVAL)
  }

  private performGarbageCollection(): void {
    const memoryUsage = this.calculateMemoryUsage()
    const maxMemoryMB = SEARCH_CONFIG.MEMORY.MAX_INDEX_SIZE_MB

    if (memoryUsage > maxMemoryMB * SEARCH_CONFIG.MEMORY.CLEANUP_THRESHOLD) {
      logger.debug(`Search index memory usage: ${memoryUsage}MB, performing cleanup...`)

      // Remove least popular posts if memory is high
      const posts = Array.from(this.index.posts.values())
      posts.sort((a, b) => a.popularity - b.popularity)

      const toRemove = Math.floor(posts.length * 0.1) // Remove 10% least popular
      for (let i = 0; i < toRemove; i++) {
        this.removePostFromIndex(posts[i].id)
      }

      logger.debug(`Removed ${toRemove} posts from search index`)
    }
  }

  private removePostFromIndex(postId: string): void {
    const post = this.index.posts.get(postId)
    if (!post) return

    // Remove from all indexes
    this.index.posts.delete(postId)

    // Remove from word indexes
    const words = this.extractWords(post.searchText)
    words.forEach((word) => {
      this.index.titleIndex.get(word)?.delete(postId)
      this.index.contentIndex.get(word)?.delete(postId)
      if (this.index.titleIndex.get(word)?.size === 0) {
        this.index.titleIndex.delete(word)
      }
      if (this.index.contentIndex.get(word)?.size === 0) {
        this.index.contentIndex.delete(word)
      }
    })

    // Remove from category/tag indexes
    post.categories.forEach((catId) => {
      this.index.categoryIndex.get(catId)?.delete(postId)
      if (this.index.categoryIndex.get(catId)?.size === 0) {
        this.index.categoryIndex.delete(catId)
      }
    })

    post.tags.forEach((tagId) => {
      this.index.tagIndex.get(tagId)?.delete(postId)
      if (this.index.tagIndex.get(tagId)?.size === 0) {
        this.index.tagIndex.delete(tagId)
      }
    })
  }

  async buildIndex(posts: any[]): Promise<void> {
    if (this.isBuilding) {
      this.buildQueue = posts
      return
    }

    this.isBuilding = true
    logger.debug(`Building optimized search index for ${posts.length} posts...`)
    const startTime = Date.now()

    try {
      // Clear existing index
      this.index = {
        posts: new Map(),
        titleIndex: new Map(),
        contentIndex: new Map(),
        categoryIndex: new Map(),
        tagIndex: new Map(),
        bigramIndex: new Map(),
        trigramIndex: new Map(),
        lastUpdated: Date.now(),
        version: this.index.version + 1,
      }

      // Process posts in optimized batches
      for (let i = 0; i < posts.length; i += SEARCH_CONFIG.PERFORMANCE.BATCH_SIZE) {
        const batch = posts.slice(i, i + SEARCH_CONFIG.PERFORMANCE.BATCH_SIZE)
        await this.processBatch(batch)

        // Yield control every batch to prevent blocking
        if (i % (SEARCH_CONFIG.PERFORMANCE.BATCH_SIZE * 4) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }

        // Check if we're exceeding time limit
        if (Date.now() - startTime > SEARCH_CONFIG.PERFORMANCE.MAX_INDEX_BUILD_TIME) {
          console.warn(`Index build taking too long, processing remaining ${posts.length - i} posts in background`)
          setTimeout(() => this.processBatch(posts.slice(i)), 0)
          break
        }
      }

      const buildTime = Date.now() - startTime
      logger.debug(`Optimized search index built in ${buildTime}ms for ${this.index.posts.size} posts`)
      logger.debug(
        `Index stats: ${this.getStats().memoryUsage}MB, ${this.index.titleIndex.size} title words, ${this.index.contentIndex.size} content words`,
      )
    } catch (error) {
      logger.error("Error building search index:", error)
    } finally {
      this.isBuilding = false

      // Process queued updates
      if (this.buildQueue.length > 0) {
        const queuedPosts = this.buildQueue
        this.buildQueue = []
        setTimeout(() => this.buildIndex(queuedPosts), 100)
      }
    }
  }

  private async processBatch(posts: any[]): Promise<void> {
    posts.forEach((post) => {
      try {
        const indexedPost = this.processPost(post)
        this.index.posts.set(indexedPost.id, indexedPost)
        this.indexWords(indexedPost)
        this.indexNGrams(indexedPost)
      } catch (error) {
        logger.error(`Error processing post ${post.id}:`, error)
      }
    })
  }

  private processPost(post: any): IndexedPost {
    const title = this.stripHtml(post.title?.rendered || post.title || "")
    const excerpt = this.stripHtml(post.excerpt?.rendered || post.excerpt || "")
    const content = this.stripHtml(post.content?.rendered || post.content || "")

    // Calculate word count and reading time
    const wordCount = content.split(/\s+/).length
    const readingTime = Math.ceil(wordCount / 200) // 200 WPM average

    // Enhanced popularity calculation
    const popularity = this.calculatePopularity(post, wordCount, readingTime)

    return {
      id: post.id?.toString() || "",
      title,
      excerpt,
      content,
      slug: post.slug || "",
      date: post.date || "",
      categories: post.categories || [],
      tags: post.tags || [],
      author: post.author || 0,
      searchText: `${title} ${excerpt} ${content}`.toLowerCase(),
      popularity,
      wordCount,
      readingTime,
    }
  }

  private calculatePopularity(post: any, wordCount: number, readingTime: number): number {
    let score = 0

    // Time-based scoring with fine-tuned decay
    const publishDate = new Date(post.date || Date.now())
    const hoursOld = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60)

    if (hoursOld < 1)
      score += 15 // Breaking news bonus
    else if (hoursOld < 6)
      score += 12 // Very recent
    else if (hoursOld < 24)
      score += 8 // Today
    else if (hoursOld < 72)
      score += 5 // This week
    else if (hoursOld < 168)
      score += 3 // This week
    else if (hoursOld < 720) score += 1 // This month

    // Content quality indicators
    if (wordCount > 2000)
      score += 5 // Long-form content
    else if (wordCount > 1000) score += 3
    else if (wordCount > 500) score += 1
    else if (wordCount < 100) score -= 2 // Penalize very short content

    // Reading time sweet spot (3-8 minutes)
    if (readingTime >= 3 && readingTime <= 8) score += 3
    else if (readingTime >= 2 && readingTime <= 10) score += 1

    // Category-based scoring
    const categories = this.extractCategories(post)
    const highPriorityCategories = ["breaking", "news", "politics", "business", "featured", "trending"]
    const mediumPriorityCategories = ["sports", "entertainment", "technology", "health"]

    categories.forEach((cat) => {
      const catLower = cat.toLowerCase()
      if (highPriorityCategories.some((priority) => catLower.includes(priority))) {
        score += 4
      } else if (mediumPriorityCategories.some((priority) => catLower.includes(priority))) {
        score += 2
      }
    })

    // Featured media bonus
    if (post.featured_media || post._embedded?.["wp:featuredmedia"]?.[0]) {
      score += 2
    }

    // Author credibility (if available)
    if (post.author && typeof post.author === "object" && post.author.posts_count > 50) {
      score += 1
    }

    return Math.max(0, score)
  }

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

  private indexWords(post: IndexedPost): void {
    const titleWords = this.extractWords(post.title.toLowerCase())
    const contentWords = this.extractWords(post.searchText)

    // Index title words with higher priority
    titleWords.forEach((word) => {
      if (!this.index.titleIndex.has(word)) {
        this.index.titleIndex.set(word, new Set())
      }
      this.index.titleIndex.get(word)!.add(post.id)
    })

    // Index content words (limited for performance)
    const limitedContentWords = contentWords.slice(0, SEARCH_CONFIG.WORD_PROCESSING.MAX_WORDS_PER_POST)
    limitedContentWords.forEach((word) => {
      if (!this.index.contentIndex.has(word)) {
        this.index.contentIndex.set(word, new Set())
      }
      this.index.contentIndex.get(word)!.add(post.id)
    })

    // Index by categories
    post.categories.forEach((categoryId) => {
      if (!this.index.categoryIndex.has(categoryId)) {
        this.index.categoryIndex.set(categoryId, new Set())
      }
      this.index.categoryIndex.get(categoryId)!.add(post.id)
    })

    // Index by tags
    post.tags.forEach((tagId) => {
      if (!this.index.tagIndex.has(tagId)) {
        this.index.tagIndex.set(tagId, new Set())
      }
      this.index.tagIndex.get(tagId)!.add(post.id)
    })
  }

  private indexNGrams(post: IndexedPost): void {
    const words = this.extractWords(post.title.toLowerCase())

    // Create bigrams and trigrams for better phrase matching
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      if (!this.index.bigramIndex.has(bigram)) {
        this.index.bigramIndex.set(bigram, new Set())
      }
      this.index.bigramIndex.get(bigram)!.add(post.id)

      // Trigrams
      if (i < words.length - 2) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
        if (!this.index.trigramIndex.has(trigram)) {
          this.index.trigramIndex.set(trigram, new Set())
        }
        this.index.trigramIndex.get(trigram)!.add(post.id)
      }
    }
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length >= SEARCH_CONFIG.WORD_PROCESSING.MIN_WORD_LENGTH &&
          word.length <= SEARCH_CONFIG.WORD_PROCESSING.MAX_WORD_LENGTH &&
          !STOP_WORDS.has(word) &&
          !/^\d+$/.test(word), // Exclude pure numbers
      )
  }

  search(query: string, options: SearchOptions = {}): IndexedPost[] {
    const startTime = Date.now()
    const {
      limit = 20,
      categories = [],
      tags = [],
      sortBy = "relevance",
      fuzzy = true,
      minScore = SEARCH_CONFIG.PERFORMANCE.MIN_SCORE_THRESHOLD,
      boostRecent = true,
    } = options

    if (!query || query.trim().length < 2) {
      return []
    }

    const searchWords = this.extractWords(query.toLowerCase())
    if (searchWords.length === 0) {
      return []
    }

    // Check for phrase searches (quoted text)
    const phraseMatch = query.match(/"([^"]+)"/g)
    const phrases = phraseMatch ? phraseMatch.map((p) => p.slice(1, -1).toLowerCase()) : []

    const postScores = new Map<string, number>()

    // Exact phrase matching (highest priority)
    phrases.forEach((phrase) => {
      const phraseWords = this.extractWords(phrase)
      if (phraseWords.length >= 2) {
        const bigram = phraseWords.slice(0, 2).join(" ")
        const bigramMatches = this.index.bigramIndex.get(bigram) || new Set()
        bigramMatches.forEach((postId) => {
          postScores.set(postId, (postScores.get(postId) || 0) + SEARCH_CONFIG.SCORING.BIGRAM_MATCH * 2)
        })

        if (phraseWords.length >= 3) {
          const trigram = phraseWords.slice(0, 3).join(" ")
          const trigramMatches = this.index.trigramIndex.get(trigram) || new Set()
          trigramMatches.forEach((postId) => {
            postScores.set(postId, (postScores.get(postId) || 0) + SEARCH_CONFIG.SCORING.TRIGRAM_MATCH * 2)
          })
        }
      }
    })

    // Individual word matching
    searchWords.forEach((word) => {
      // Exact matches in title (highest score)
      const titleMatches = this.index.titleIndex.get(word) || new Set()
      titleMatches.forEach((postId) => {
        postScores.set(postId, (postScores.get(postId) || 0) + SEARCH_CONFIG.SCORING.TITLE_EXACT_MATCH)
      })

      // Exact matches in content
      const contentMatches = this.index.contentIndex.get(word) || new Set()
      contentMatches.forEach((postId) => {
        postScores.set(postId, (postScores.get(postId) || 0) + SEARCH_CONFIG.SCORING.CONTENT_EXACT_MATCH)
      })

      // Fuzzy matches if enabled
      if (fuzzy && word.length > 3) {
        this.index.titleIndex.forEach((postIds, indexedWord) => {
          const similarity = this.calculateSimilarity(word, indexedWord)
          if (similarity > 0.7) {
            const score = SEARCH_CONFIG.SCORING.TITLE_FUZZY_MATCH * similarity
            postIds.forEach((postId) => {
              postScores.set(postId, (postScores.get(postId) || 0) + score)
            })
          }
        })

        this.index.contentIndex.forEach((postIds, indexedWord) => {
          const similarity = this.calculateSimilarity(word, indexedWord)
          if (similarity > 0.8) {
            // Higher threshold for content
            const score = SEARCH_CONFIG.SCORING.CONTENT_FUZZY_MATCH * similarity
            postIds.forEach((postId) => {
              postScores.set(postId, (postScores.get(postId) || 0) + score)
            })
          }
        })
      }
    })

    // Apply filters and calculate final scores
    const results: { post: IndexedPost; score: number }[] = []

    postScores.forEach((score, postId) => {
      const post = this.index.posts.get(postId)
      if (!post) return

      // Apply category filter
      if (categories.length > 0) {
        const hasMatchingCategory = categories.some((catId) => post.categories.includes(Number(catId)))
        if (!hasMatchingCategory) return
      }

      // Apply tag filter
      if (tags.length > 0) {
        const hasMatchingTag = tags.some((tagId) => post.tags.includes(Number(tagId)))
        if (!hasMatchingTag) return
      }

      let finalScore = score

      // Add popularity bonus
      finalScore += post.popularity * SEARCH_CONFIG.SCORING.POPULARITY_MULTIPLIER

      // Recent content boost
      if (boostRecent) {
        const hoursOld = (Date.now() - new Date(post.date).getTime()) / (1000 * 60 * 60)
        if (hoursOld < 24) {
          finalScore += SEARCH_CONFIG.SCORING.RECENCY_BONUS_MAX * (1 - hoursOld / 24)
        }
      }

      // Reading time bonus for optimal length
      if (post.readingTime >= 3 && post.readingTime <= 8) {
        finalScore += SEARCH_CONFIG.SCORING.READING_TIME_BONUS
      }

      // Only include results above minimum score threshold
      if (finalScore >= minScore) {
        results.push({ post, score: finalScore })
      }
    })

    // Sort results based on criteria
    this.sortResults(results, sortBy)

    const searchTime = Date.now() - startTime
    if (searchTime > SEARCH_CONFIG.PERFORMANCE.MAX_SEARCH_TIME) {
      console.warn(`Slow search query: "${query}" took ${searchTime}ms`)
    }

    return results.slice(0, limit).map((result) => result.post)
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length < 2 || str2.length < 2) return 0

    // Use Jaro-Winkler for better performance on short strings
    return this.jaroWinkler(str1, str2)
  }

  private jaroWinkler(s1: string, s2: string): number {
    const jaro = this.jaro(s1, s2)
    if (jaro < 0.7) return jaro

    // Calculate common prefix length (up to 4 characters)
    let prefix = 0
    for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
      if (s1[i] === s2[i]) prefix++
      else break
    }

    return jaro + 0.1 * prefix * (1 - jaro)
  }

  private jaro(s1: string, s2: string): number {
    if (s1.length === 0 && s2.length === 0) return 1
    if (s1.length === 0 || s2.length === 0) return 0

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
    const s1Matches = new Array(s1.length).fill(false)
    const s2Matches = new Array(s2.length).fill(false)

    let matches = 0
    let transpositions = 0

    // Find matches
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow)
      const end = Math.min(i + matchWindow + 1, s2.length)

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue
        s1Matches[i] = s2Matches[j] = true
        matches++
        break
      }
    }

    if (matches === 0) return 0

    // Find transpositions
    let k = 0
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue
      while (!s2Matches[k]) k++
      if (s1[i] !== s2[k]) transpositions++
      k++
    }

    return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  }

  private sortResults(results: Array<{ post: IndexedPost; score: number }>, sortBy: string): void {
    results.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
        case "popularity":
          return b.post.popularity - a.post.popularity
        case "reading_time":
          // Prefer 3-8 minute reads
          const aOptimal = Math.abs(a.post.readingTime - 5.5)
          const bOptimal = Math.abs(b.post.readingTime - 5.5)
          return aOptimal - bOptimal
        default: // relevance
          return b.score - a.score
      }
    })
  }

  getSuggestions(query: string, limit = SEARCH_CONFIG.PERFORMANCE.MAX_SUGGESTIONS): string[] {
    if (!query || query.length < 2) {
      return []
    }

    const suggestions = new Map<string, number>() // suggestion -> score
    const queryLower = query.toLowerCase()

    // Get suggestions from title index (highest priority)
    this.index.titleIndex.forEach((postIds, word) => {
      if (word.startsWith(queryLower)) {
        suggestions.set(word, (suggestions.get(word) || 0) + postIds.size * 3)
      } else if (word.includes(queryLower)) {
        suggestions.set(word, (suggestions.get(word) || 0) + postIds.size)
      }
    })

    // Get suggestions from bigrams
    this.index.bigramIndex.forEach((postIds, bigram) => {
      if (bigram.startsWith(queryLower)) {
        suggestions.set(bigram, (suggestions.get(bigram) || 0) + postIds.size * 2)
      }
    })

    // Get suggestions from content index (lower priority)
    if (suggestions.size < limit) {
      this.index.contentIndex.forEach((postIds, word) => {
        if (suggestions.size >= limit * 2) return // Limit processing
        if (word.startsWith(queryLower) && word.length <= queryLower.length + 4) {
          suggestions.set(word, (suggestions.get(word) || 0) + postIds.size * 0.5)
        }
      })
    }

    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([suggestion]) => suggestion)
  }

  needsUpdate(): boolean {
    const now = Date.now()
    const hour = new Date().getHours()

    let updateInterval: number
    if (hour >= 9 && hour <= 17) {
      updateInterval = SEARCH_CONFIG.UPDATE_INTERVALS.PEAK_HOURS
    } else if (hour >= 22 || hour <= 6) {
      updateInterval = SEARCH_CONFIG.UPDATE_INTERVALS.NIGHT
    } else {
      updateInterval = SEARCH_CONFIG.UPDATE_INTERVALS.OFF_PEAK
    }

    return (now - this.index.lastUpdated > updateInterval || this.index.posts.size === 0) && !this.isBuilding
  }

  getStats() {
    const memoryUsage = this.calculateMemoryUsage()

    return {
      totalPosts: this.index.posts.size,
      titleWords: this.index.titleIndex.size,
      contentWords: this.index.contentIndex.size,
      bigrams: this.index.bigramIndex.size,
      trigrams: this.index.trigramIndex.size,
      categories: this.index.categoryIndex.size,
      tags: this.index.tagIndex.size,
      lastUpdated: new Date(this.index.lastUpdated).toISOString(),
      memoryUsage: `${memoryUsage.toFixed(2)} MB`,
      version: this.index.version,
      averagePopularity: this.calculateAveragePopularity(),
      isBuilding: this.isBuilding,
      queuedUpdates: this.buildQueue.length,
    }
  }

  private calculateMemoryUsage(): number {
    const indexData = {
      posts: Array.from(this.index.posts.entries()),
      titleIndex: Array.from(this.index.titleIndex.entries()),
      contentIndex: Array.from(this.index.contentIndex.entries()),
      bigramIndex: Array.from(this.index.bigramIndex.entries()),
      trigramIndex: Array.from(this.index.trigramIndex.entries()),
    }

    return JSON.stringify(indexData).length / (1024 * 1024) // Convert to MB
  }

  private calculateAveragePopularity(): number {
    if (this.index.posts.size === 0) return 0

    const totalPopularity = Array.from(this.index.posts.values()).reduce((sum, post) => sum + post.popularity, 0)

    return totalPopularity / this.index.posts.size
  }

  getHealthStatus() {
    const stats = this.getStats()
    const issues: string[] = []

    if (stats.totalPosts === 0) {
      issues.push("No posts indexed")
    }

    if (this.needsUpdate()) {
      issues.push("Index needs update")
    }

    const memoryUsageMB = Number.parseFloat(stats.memoryUsage.split(" ")[0])
    if (memoryUsageMB > SEARCH_CONFIG.MEMORY.MAX_INDEX_SIZE_MB) {
      issues.push(`High memory usage: ${stats.memoryUsage}`)
    }

    if (stats.titleWords < 100) {
      issues.push("Low word count in title index")
    }

    if (this.isBuilding) {
      issues.push("Index build in progress")
    }

    return {
      status: issues.length === 0 ? "healthy" : issues.length <= 2 ? "warning" : "degraded",
      issues,
      stats,
      config: SEARCH_CONFIG,
    }
  }

  clear(): void {
    this.index = {
      posts: new Map(),
      titleIndex: new Map(),
      contentIndex: new Map(),
      categoryIndex: new Map(),
      tagIndex: new Map(),
      bigramIndex: new Map(),
      trigramIndex: new Map(),
      lastUpdated: 0,
      version: 1,
    }

    if (this.gcTimer) {
      clearInterval(this.gcTimer)
      this.gcTimer = null
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  // Legacy methods for compatibility
  private cache = new Map<string, SearchDocument[]>()
  private cacheTimeout = 5 * 60 * 1000

  async indexPost(post: any): Promise<void> {
    this.clearCache()
  }

  async removePost(postId: string): Promise<void> {
    this.removePostFromIndex(postId)
    this.clearCache()
  }

  async updatePost(post: any): Promise<void> {
    this.clearCache()
  }

  private clearCache(): void {
    this.cache.clear()
  }

  async searchPosts(
    query: string,
    options: {
      categories?: string[]
      tags?: string[]
      limit?: number
      offset?: number
    } = {},
  ): Promise<{ posts: SearchDocument[]; total: number }> {
    const cacheKey = `${query}-${JSON.stringify(options)}`

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      return { posts: cached, total: cached.length }
    }

    try {
      const searchParams = new URLSearchParams({
        search: query,
        per_page: (options.limit || 10).toString(),
        offset: (options.offset || 0).toString(),
        _embed: "true",
      })

      if (options.categories?.length) {
        searchParams.append("categories", options.categories.join(","))
      }

      if (options.tags?.length) {
        searchParams.append("tags", options.tags.join(","))
      }

      const response = await fetch(`${siteConfig.wordpress.apiUrl}/posts?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const posts = await response.json()
      const total = Number.parseInt(response.headers.get("X-WP-Total") || "0")

      const searchDocuments: SearchDocument[] = posts.map((post: any) => ({
        id: post.id.toString(),
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        slug: post.slug,
        date: post.date,
        categories: post._embedded?.["wp:term"]?.[0]?.map((cat: any) => cat.name) || [],
        tags: post._embedded?.["wp:term"]?.[1]?.map((tag: any) => tag.name) || [],
        author: post._embedded?.author?.[0]?.name || "Unknown",
        featured_media_url: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url,
      }))

      this.cache.set(cacheKey, searchDocuments)
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout)

      return { posts: searchDocuments, total }
    } catch (error) {
      logger.error("Search indexer error:", error)
      return { posts: [], total: 0 }
    }
  }
}

export const searchIndexer = new SearchIndexer()
