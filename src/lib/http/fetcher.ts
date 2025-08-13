import 'server-only';

export type FetchOpts = RequestInit & { revalidate?: number; tags?: string[] };

export async function jfetch<T>(url: string, init?: FetchOpts): Promise<T> {
  const res = await fetch(url, { ...init, next: { revalidate: init?.revalidate ?? 300, tags: init?.tags } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function jpost<T>(url: string, body: unknown, init?: FetchOpts): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
    next: { revalidate: init?.revalidate ?? 0, tags: init?.tags },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
