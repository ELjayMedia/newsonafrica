import type { Country } from './countries';

export const DEFAULT_CATEGORIES = [
  'news',
  'business',
  'sport',
  'entertainment',
  'lifestyle',
  'health',
  'politics',
  'food',
  'opinion',
] as const;

export type Category = typeof DEFAULT_CATEGORIES[number];

export const COUNTRY_CATEGORIES: Record<Country, readonly Category[]> = {
  za: DEFAULT_CATEGORIES,
  ng: DEFAULT_CATEGORIES,
  ke: DEFAULT_CATEGORIES,
  gh: DEFAULT_CATEGORIES,
  bw: DEFAULT_CATEGORIES,
  zw: DEFAULT_CATEGORIES,
  mz: DEFAULT_CATEGORIES,
  ls: DEFAULT_CATEGORIES,
  sz: DEFAULT_CATEGORIES,
};

export function getCategoriesForCountry(country: Country | null | undefined): readonly Category[] {
  return COUNTRY_CATEGORIES[country as Country] ?? DEFAULT_CATEGORIES;
}
