'use client';
import { useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

export function useCommentsRealtime(articleId: string, onNew: (c: any) => void) {
  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `article_id=eq.${articleId}` }, (payload) => {
        if (payload.new.is_approved) {
          onNew(payload.new);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId, onNew]);
}
