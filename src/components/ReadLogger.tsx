'use client';

import { useEffect } from 'react';

import { useUser } from '@/contexts/UserContext';
import { createClient } from '@/utils/supabase/client';

interface ReadLoggerProps {
  postId: string;
  category?: string | null;
  tags?: string[];
}

export function ReadLogger({ postId, category, tags }: ReadLoggerProps) {
  const { user } = useUser();

  useEffect(() => {
    const logRead = async () => {
      if (!user) return;
      try {
        const supabase = createClient();
        await supabase.from('read_history').insert({
          user_id: user.id,
          post_id: postId,
          category,
          tags,
        });
      } catch (error) {
        console.error('Error logging read history:', error);
      }
    };
    logRead();
  }, [user, postId, category, tags]);

  return null;
}

export default ReadLogger;
