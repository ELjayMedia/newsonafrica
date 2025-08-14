'use client';

import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { stripHtml, highlightSearchTerms } from '@/lib/search';


interface SearchResultsProps {
  results: any[];
  query: string;
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function SearchResults({
  results,
  query,
  total,
  currentPage,
  totalPages,
  hasMore,
  isLoading,
  onLoadMore,
}: SearchResultsProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Searching...</p>
      </div>
    );
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">
            We couldn&apos;t find any matches for &quot;{query}&quot;. Please try a different search term or
            check your spelling.
          </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="text-sm text-gray-500">
          Found {total} {total === 1 ? 'result' : 'results'} for &quot;{query}&quot;
        </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="border-b border-gray-200 pb-4 last:border-0">
            <Link href={`/post/${result.slug}`} className="block group">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {isClient ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerms(result.title.rendered, query),
                    }}
                  />
                ) : (
                  result.title.rendered
                )}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>
                  {result.date
                    ? formatDistanceToNow(new Date(result.date), { addSuffix: true })
                    : 'Unknown date'}
                </span>
                {result._embedded?.author && <span>• {result._embedded.author[0]?.name}</span>}
              </div>
              <p className="mt-1 text-gray-600">
                {isClient ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerms(
                        stripHtml(result.excerpt.rendered).slice(0, 200),
                        query,
                      ),
                    }}
                  />
                ) : (
                  stripHtml(result.excerpt.rendered).slice(0, 200)
                )}
                {stripHtml(result.excerpt.rendered).length > 200 ? '...' : ''}
              </p>
            </Link>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="min-w-[120px]"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isLoading ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="text-sm text-center text-gray-500 pt-2">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </div>
  );
}
