import pLimit from "p-limit"

import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { searchWordPressPosts as wpSearchPosts } from "@/lib/wordpress-search"
import type { SearchRecord } from "@/types/search"

import type { SearchScope } from "./shared"

export const MAX_PAGES_PER_COUNTRY = 6
export const MAX_CONCURRENT_COUNTRY_FETCHES = 3
const RESULT_BUFFER_RATIO = 0.2
const RESULT_BUFFER_MIN = 10
export const REQUEST_BUDGET = SUPPORTED_COUNTRIES.length * MAX_PAGES_PER_COUNTRY

export const fromWordPressResults = (
  results: Awaited<ReturnType<typeof wpSearchPosts>>,
  country: string,
): SearchRecord[] =>
  results.results.map((post) => ({
    objectID: `${country}:${post.slug || post.id}`,
    title: stripHtml(post.title?.rendered || "").trim() || post.title?.rendered || "Untitled",
    excerpt: stripHtml(post.excerpt?.rendered || "").trim(),
    categories:
      post._embedded?.["wp:term"]?.[0]?.map((term) => term.name)?.filter((name): name is string => Boolean(name)) || [],
    country,
    published_at: new Date(post.date || new Date().toISOString()).toISOString(),
  }))

type HeapNode = { record: SearchRecord; timestamp: number }

type CountryState = {
  code: string
  nextPage: number
  hasMore: boolean
  pagesFetched: number
  oldestTimestampFetched?: number
}

export type WordPressScopeResult = {
  results: SearchRecord[]
  total: number
  totalPages: number
  currentPage: number
  hasMore: boolean
  suggestions: string[]
  performance: {
    totalRequests: number
    requestBudget: number
    budgetExhausted: boolean
    elapsedMs: number
  }
}

const uniqueSuggestions = (records: SearchRecord[]): string[] =>
  Array.from(new Set(records.map((record) => record.title).filter(Boolean))).slice(0, 10)

export const executeWordPressSearchForScope = async (
  query: string,
  scope: SearchScope,
  page: number,
  perPage: number,
): Promise<WordPressScopeResult> => {
  const safePage = Math.max(1, page)
  const safePerPage = Math.max(1, perPage)

  if (scope.type === "country") {
    const response = await wpSearchPosts(query, {
      page: safePage,
      perPage: safePerPage,
      country: scope.country,
    })

    const records = fromWordPressResults(response, scope.country)

    return {
      results: records.slice((safePage - 1) * safePerPage, safePage * safePerPage),
      total: response.total,
      totalPages: response.totalPages,
      currentPage: response.currentPage,
      hasMore: response.hasMore,
      suggestions: uniqueSuggestions(records),
      performance: {
        totalRequests: 1,
        requestBudget: REQUEST_BUDGET,
        budgetExhausted: false,
        elapsedMs: response.searchTime ?? 0,
      },
    }
  }

  const desiredTotal = safePage * safePerPage
  const countryCount = Math.max(1, SUPPORTED_COUNTRIES.length)
  const basePerCountry = Math.ceil(desiredTotal / countryCount)
  const buffer = Math.max(2, Math.ceil(basePerCountry * 0.1))
  const perCountryFetchSize = Math.min(
    100,
    Math.max(safePerPage, Math.max(1, basePerCountry + buffer)),
  )
  const desiredWithBuffer = desiredTotal + Math.max(
    RESULT_BUFFER_MIN,
    Math.ceil(desiredTotal * RESULT_BUFFER_RATIO),
  )
  const limit = pLimit(MAX_CONCURRENT_COUNTRY_FETCHES)
  const searchStart = Date.now()
  let totalRequests = 0
  let budgetExhausted = false

  const heap: HeapNode[] = []
  const maxHeapSize = Math.max(1, desiredWithBuffer)
  let total = 0
  const suggestionSet = new Set<string>()
  const countryTotals = new Map<string, number>()

  const siftUp = (index: number) => {
    let current = index
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2)
      if (heap[current].timestamp >= heap[parent].timestamp) {
        break
      }
      ;[heap[current], heap[parent]] = [heap[parent], heap[current]]
      current = parent
    }
  }

  const siftDown = (index: number) => {
    let current = index
    const length = heap.length

    while (true) {
      const left = current * 2 + 1
      const right = left + 1
      let smallest = current

      if (left < length && heap[left].timestamp < heap[smallest].timestamp) {
        smallest = left
      }

      if (right < length && heap[right].timestamp < heap[smallest].timestamp) {
        smallest = right
      }

      if (smallest === current) {
        break
      }

      ;[heap[current], heap[smallest]] = [heap[smallest], heap[current]]
      current = smallest
    }
  }

  const addToHeap = (record: SearchRecord) => {
    const timestamp = new Date(record.published_at ?? 0).getTime()
    const node: HeapNode = { record, timestamp }

    if (heap.length < maxHeapSize) {
      heap.push(node)
      siftUp(heap.length - 1)
      return
    }

    if (heap[0].timestamp >= timestamp) {
      return
    }

    heap[0] = node
    siftDown(0)
  }

  const addSuggestion = (title: string | undefined) => {
    if (!title) {
      return
    }

    if (suggestionSet.has(title) || suggestionSet.size < 10) {
      suggestionSet.add(title)
    }
  }

  const fetchAndProcessPage = async (state: CountryState, pageToFetch: number) => {
    if (budgetExhausted || totalRequests >= REQUEST_BUDGET) {
      budgetExhausted = true
      return 0
    }

    totalRequests += 1
    const response = await wpSearchPosts(query, {
      page: pageToFetch,
      perPage: perCountryFetchSize,
      country: state.code,
    })
    const records = fromWordPressResults(response, state.code)

    if (!countryTotals.has(state.code)) {
      total += response.total
      countryTotals.set(state.code, response.total)
    }

    let pageOldestTimestamp: number | undefined

    records.forEach((record) => {
      addToHeap(record)
      addSuggestion(record.title)
      const timestamp = new Date(record.published_at ?? 0).getTime()
      pageOldestTimestamp = typeof pageOldestTimestamp === "number"
        ? Math.min(pageOldestTimestamp, timestamp)
        : timestamp
    })

    if (typeof pageOldestTimestamp === "number") {
      state.oldestTimestampFetched = typeof state.oldestTimestampFetched === "number"
        ? Math.min(state.oldestTimestampFetched, pageOldestTimestamp)
        : pageOldestTimestamp
    }

    state.nextPage = response.currentPage + 1
    state.pagesFetched += 1
    state.hasMore = response.hasMore && state.pagesFetched < MAX_PAGES_PER_COUNTRY

    if (totalRequests >= REQUEST_BUDGET) {
      budgetExhausted = true
    }
    return records.length
  }

  const countryStates: CountryState[] = SUPPORTED_COUNTRIES.map((country) => ({
    code: country.code.toLowerCase(),
    nextPage: 1,
    hasMore: true,
    pagesFetched: 0,
  }))

  await Promise.all(countryStates.map((state) => limit(() => fetchAndProcessPage(state, 1))))

  while (true) {
    if (budgetExhausted) {
      break
    }

    const statesWithMore = countryStates.filter((state) => state.hasMore)

    if (statesWithMore.length === 0) {
      break
    }

    const heapOldestTimestamp = heap[0]?.timestamp ?? Number.NEGATIVE_INFINITY
    const shouldContinue =
      heap.length < desiredWithBuffer ||
      statesWithMore.some((state) => {
        const oldestForCountry = state.oldestTimestampFetched
        return typeof oldestForCountry === "number" && oldestForCountry > heapOldestTimestamp
      })

    if (!shouldContinue) {
      break
    }

    const additions = await Promise.all(
      statesWithMore.map((state) => limit(() => fetchAndProcessPage(state, state.nextPage))),
    )

    const addedRecords = additions.reduce((sum, count) => sum + count, 0)

    if (addedRecords === 0) {
      break
    }
  }

  const getRecordTimestamp = (record: SearchRecord) => new Date(record.published_at ?? 0).getTime()

  const sortedRecords = heap
    .map((entry) => entry.record)
    .sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a))

  const startIndex = (safePage - 1) * safePerPage
  const endIndex = startIndex + safePerPage
  const pageResults = sortedRecords.slice(startIndex, endIndex)

  return {
    results: pageResults,
    total,
    totalPages: Math.max(1, Math.ceil(total / safePerPage)),
    currentPage: safePage,
    hasMore: endIndex < total,
    suggestions: Array.from(suggestionSet),
    performance: {
      totalRequests,
      requestBudget: REQUEST_BUDGET,
      budgetExhausted,
      elapsedMs: Date.now() - searchStart,
    },
  }
}
