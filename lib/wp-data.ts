import { gqlClient } from './gql';
import { PostsByCountryDocument, PostBySlugDocument } from '@/graphql/generated';

const COUNTRY_SLUGS: Record<string, string> = {
  SZ: 'sz',
  ZA: 'za',
  DEFAULT: 'pan-africa',
};

function countrySlug(countryIso?: string) {
  const key = (countryIso || 'DEFAULT').toUpperCase();
  return COUNTRY_SLUGS[key] || COUNTRY_SLUGS.DEFAULT;
}

export async function getPostsByCountry(
  countryIso: string,
  opts?: { category?: string; first?: number; after?: string }
) {
  const client = gqlClient(countryIso);
  const vars = {
    countrySlug: [countrySlug(countryIso)],
    category: opts?.category || null,
    first: opts?.first ?? 20,
    after: opts?.after ?? null,
  };
  const data = await client.request(PostsByCountryDocument, vars);
  return data.posts;
}

export async function getPostBySlug(countryIso: string, slug: string) {
  const client = gqlClient(countryIso);
  const data = await client.request(PostBySlugDocument, { slug });
  return data.postBy;
}
