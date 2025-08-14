'use client';

import useSWR from 'swr';

export function useFeatureFlag(name: string, country?: string) {
  const params = new URLSearchParams({ name });
  if (country) params.set('country', country);
  const { data } = useSWR<{ enabled: boolean }>(
    `/api/feature-flags?${params.toString()}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load feature flag');
      return res.json();
    },
  );
  return data?.enabled ?? false;
}
