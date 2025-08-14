export type MarketItem = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
};

import localMarkets from './markets.json';

export async function getMarketSnapshot(): Promise<MarketItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/markets.json` : '/markets.json';
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      throw new Error(`Failed to fetch market snapshot: ${res.status}`);
    }
    return (await res.json()) as MarketItem[];
  } catch (error) {
    if (!baseUrl) {
      return localMarkets as MarketItem[];
    }
    console.error('Error loading market snapshot:', error);
    return [];
  }
}
