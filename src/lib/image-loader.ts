export default function imageProxyLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const url = new URL('/api/img', 'http://localhost');
  url.searchParams.set('src', src);
  url.searchParams.set('w', width.toString());
  if (quality) url.searchParams.set('q', quality.toString());
  return url.pathname + url.search;
}
