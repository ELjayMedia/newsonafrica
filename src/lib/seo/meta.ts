export function titleTemplate(title: string, country?: string) {
  return `${title} — News On Africa${country ? ' • ' + country.toUpperCase() : ''}`;
}

export function canonicalUrl(country: string, path: string) {
  return `https://newsonafrica.com/${country}${path}`;
}

export function ogImageUrl(title: string, image?: string) {
  if (image) return image;
  const encoded = encodeURIComponent(title);
  return `/api/og?title=${encoded}`;
}

const COUNTRIES = ['za', 'sz']; // extend with activated countries

export function hreflangLinks(country: string, path: string) {
  const links = COUNTRIES.map(c => ({
    hrefLang: `en-${c.toUpperCase()}`,
    href: canonicalUrl(c, path),
  }));
  links.push({ hrefLang: 'x-default', href: canonicalUrl(country, path) });
  return links;
}
