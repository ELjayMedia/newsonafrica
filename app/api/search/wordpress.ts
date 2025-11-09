import pLimit from "p-limit"

import { stripHtml } from "@/lib/search"
import { SUPPORTED_COUNTRIES } from "@/lib/editions"
import { searchWordPressPosts } from "@/lib/wordpress-search"
import type { SearchRecord } from "@/types/search"

import type { SearchScope } from "./shared"

export const MAX_PAGES_PER_COUNTRY = 6
export const MAX_CONCURRENT_COUNTRY_FETCHES = 3
const RESULT_BUFFER_RATIO = 0.2
const RESULT_BUFFER_MIN = 10
const REQUEST_BUDGET = SUPPORTED_COUNTRIES.length * MAX_PAGES_PER_COUNTRY

type HeapNode = { record: SearchRecord; timestamp: number }

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

export const fromWordPressResults = (
  results: Awaited<ReturnType<typeof searchWordPressPosts>>,
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

export const uniqueSuggestions = (records: SearchRecord[]): string[] =>
  Array.from(new Set(records.map((record) => record.title).filter(Boolean))).slice(0, 10)

const siftUp = (heap: HeapNode[], index: number) => {
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

const siftDown = (heap: HeapNode[], index: number) => {
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

const addSuggestion = (suggestionSet: Set<string>, title: string | undefined) => {
  if (!title) {
    return
  }

  if (suggestionSet.has(title) || suggestionSet.size < 10) {
    suggestionSet.add(title)
  }
}

export const executeWordPressSearchForScope = async (
  query: string,
  scope: SearchScope,
  page: number,
  perPage: number,
): Promise<WordPressScopeResult> => {
  const safePage = Math.max(1, page)
  const safePerPage = Math.max(1, perPage)

  if (scope.type === "panAfrican") {
    const desiredTotal = safePage * safePerPage
    const countryCount = Math.max(1, SUPPORTED_COUNTRIES.length)
    const basePerCountry = Math.ceil(desiredTotal / countryCount)
    const buffer = Math.max(2, Math.ceil(basePerCountry * 0.1))
    const perCountryFetchSize = Math.min(100, Math.max(1, basePerCountry + buffer))
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

    type CountryState = {
      code: string
      nextPage: number
      hasMore: boolean
      pagesFetched: number
      oldestTimestampFetched?: number
    }

    const fetchAndProcessPage = async (state: CountryState, pageToFetch: number) => {
      if (budgetExhausted || totalRequests >= REQUEST_BUDGET) {
        budgetExhausted = true
        return 0
      }

      totalRequests += 1
      const response = await searchWordPressPosts(query, {
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
        const timestamp = new Date(record.published_at ?? 0).getTime()

        if (heap.length < maxHeapSize) {
          heap.push({ record, timestamp })
          siftUp(heap, heap.length - 1)
        } else if (heap[0].timestamp < timestamp) {
          heap[0] = { record, timestamp }
          siftDown(heap, 0)
        }

        addSuggestion(suggestionSet, record.title)

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

    while (!budgetExhausted) {
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
    const paginatedRecords = sortedRecords.slice(startIndex, startIndex + safePerPage)
    const totalPages = Math.max(1, Math.ceil(total / safePerPage))

    return {
      results: paginatedRecords,
      total,
      totalPages,
      currentPage: safePage,
      hasMore: safePage < totalPages,
      suggestions: Array.from(suggestionSet),
      performance: {
        totalRequests,
        requestBudget: REQUEST_BUDGET,
        budgetExhausted,
        elapsedMs: Date.now() - searchStart,
      },
    }
  }

  const countryCode = scope.country
  const response = await searchWordPressPosts(query, {
    page: safePage,
    perPage: safePerPage,
    country: countryCode,
  })
  const records = fromWordPressResults(response, countryCode)

  return {
    results: records,
    total: response.total,
    totalPages: response.totalPages,
    currentPage: response.currentPage,
    hasMore: response.hasMore,
    suggestions: uniqueSuggestions(records),
    performance: {
      totalRequests: 1,
      requestBudget: REQUEST_BUDGET,
      budgetExhausted: false,
      elapsedMs: 0,
    },
  }
}
