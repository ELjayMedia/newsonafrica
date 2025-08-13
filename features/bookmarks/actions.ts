'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';

import { tag } from '@/lib/cache/revalidate';
import { createClient } from '@/utils/supabase/server';

export async function toggleBookmark(slug: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { data: existing, error: fetchError } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
    if (error) {
      return { error: error.message };
    }
    revalidateTag(tag.bookmarks(user.id));
    return { bookmarked: false };
  } else {
    const { error } = await supabase.from('bookmarks').insert({
      user_id: user.id,
      post_id: slug,
      title: slug,
      slug,
    });
    if (error) {
      return { error: error.message };
    }
    revalidateTag(tag.bookmarks(user.id));
    return { bookmarked: true };
  }
}

// TODO: Wire up UI bookmark button to use this server action
