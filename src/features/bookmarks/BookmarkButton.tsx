'use client';
import { useOptimistic, useTransition } from 'react';

import { toggleBookmark } from './actions';

import { useToast } from '@/hooks/use-toast';

export function BookmarkButton({ slug, initial }: { slug: string; initial: boolean }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useOptimistic(initial, (_: boolean, v: boolean) => v);
  const { toast } = useToast();
  return (
    <button
      aria-pressed={saved}
      onClick={() =>
        start(async () => {
          const next = !saved;
          setSaved(next);
          try {
            await toggleBookmark(slug);
          } catch (error) {
            console.error('Error toggling bookmark:', error);
            setSaved(!next);
            toast({
              title: 'Error',
              description: 'Failed to update bookmark. Please try again.',
              variant: 'destructive',
            });
          }
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-2 px-3 py-1 rounded border"
    >
      {saved ? '★ Bookmarked' : '☆ Bookmark'}
    </button>
  );
}
