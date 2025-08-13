'use client';
import { useOptimistic, useTransition } from 'react';
import { toggleBookmark } from './actions';
export function BookmarkButton({ slug, initial }: { slug: string; initial: boolean }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useOptimistic(initial, (s) => !s);
  return (
    <button
      aria-pressed={saved}
      onClick={() =>
        start(async () => {
          setSaved(null as any);
          await toggleBookmark(slug);
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-2 px-3 py-1 rounded border"
    >
      {saved ? '★ Bookmarked' : '☆ Bookmark'}
    </button>
  );
}
