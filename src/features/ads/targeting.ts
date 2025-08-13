export function buildAdTargeting({
  country,
  category,
  articleId,
  tags = [],
  loggedIn = false,
}: {
  country?: string;
  category?: string;
  articleId?: string;
  tags?: string[];
  loggedIn?: boolean;
}) {
  const kv: Record<string, string | string[]> = {};
  if (country) kv.country = country;
  if (category) kv.category = category;
  if (articleId) kv.article = articleId;
  if (tags.length) kv.tags = tags.slice(0, 5);
  kv.login = loggedIn ? '1' : '0';
  return kv;
}
