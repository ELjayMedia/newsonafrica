import 'server-only';

export async function jfetch<T>(url: string, init?: RequestInit & { revalidate?: number; tags?: string[] }) {
  const res = await fetch(url, { ...init, next: { revalidate: init?.revalidate ?? 300, tags: init?.tags } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
