export type MarketItem = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
};

export async function getMarketSnapshot(): Promise<MarketItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (baseUrl) {
      const url = `${baseUrl.replace(/\/$/, '')}/markets.json`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) {
        throw new Error(`Failed to fetch market snapshot: ${res.status}`);
      }
      return await res.json();
    }

    const { readFile } = await import('fs/promises');
    const filePath = `${process.cwd()}/public/markets.json`;
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data) as MarketItem[];
  } catch (error) {
    console.error('Error loading market snapshot:', error);
    return [];
  }
}
