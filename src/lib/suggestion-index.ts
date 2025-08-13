import { existsSync, promises as fs } from 'fs';
import path from 'path';

import { fetchRecentPosts } from '@/lib/wordpress-api';

const INDEX_FILE = path.join(process.cwd(), 'data', 'suggestion-index.json');
const INDEX_TTL = 12 * 60 * 60 * 1000; // 12 hours
const QUERY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

let suggestionIndex: string[] = [];
let lastUpdated = 0;

const queryCache = new Map<string, { suggestions: string[]; timestamp: number }>();
let cacheHits = 0;
let cacheMisses = 0;

async function loadIndexFromDisk() {
  if (!existsSync(INDEX_FILE)) {
    await buildSuggestionIndex();
    return;
  }

  try {
    const data = await fs.readFile(INDEX_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    suggestionIndex = parsed.suggestions || [];
    lastUpdated = parsed.lastUpdated || 0;
  } catch (error) {
    console.error('Failed to load suggestion index', error);
  }
}

export async function buildSuggestionIndex(): Promise<void> {
  try {
    const { posts } = await fetchRecentPosts(100);
    const suggestions = new Set<string>();

    posts.forEach((post: any) => {
      const titleWords = post.title
        ?.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      titleWords?.forEach((w: string) => suggestions.add(w));

      post.categories?.nodes.forEach((c: any) => suggestions.add(c.name.toLowerCase()));
      post.tags?.nodes?.forEach((t: any) => suggestions.add(t.name.toLowerCase()));
    });

    suggestionIndex = Array.from(suggestions).sort();
    lastUpdated = Date.now();

    await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
    await fs.writeFile(
      INDEX_FILE,
      JSON.stringify({ suggestions: suggestionIndex, lastUpdated }, null, 2),
      'utf-8',
    );
    queryCache.clear();
  } catch (error) {
    console.error('Failed to build suggestion index', error);
  }
}

async function refreshIfNeeded() {
  if (Date.now() - lastUpdated > INDEX_TTL || suggestionIndex.length === 0) {
    await loadIndexFromDisk();
  }
}

export async function getSuggestions(
  query: string,
  limit = 8,
): Promise<{ suggestions: string[]; cacheHit: boolean }> {
  await refreshIfNeeded();
  if (!query || query.length < 2) {
    return { suggestions: [], cacheHit: false };
  }

  const key = `${query}:${limit}`;
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL) {
    cacheHits++;
    return { suggestions: cached.suggestions, cacheHit: true };
  }

  cacheMisses++;
  const queryLower = query.toLowerCase();
  const results = suggestionIndex.filter((s) => s.startsWith(queryLower)).slice(0, limit);
  queryCache.set(key, { suggestions: results, timestamp: Date.now() });
  return { suggestions: results, cacheHit: false };
}

export function getSuggestionCacheStats() {
  return { hits: cacheHits, misses: cacheMisses };
}

void loadIndexFromDisk();
