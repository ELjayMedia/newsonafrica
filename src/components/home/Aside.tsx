import { MarketTicker } from './MarketTicker';

import { GamesPromo } from '@/components/aside/GamesPromo';
import { MostRead } from '@/components/aside/MostRead';
import { PollWidget } from '@/components/aside/PollWidget';
import { SponsoredPromo } from '@/components/aside/SponsoredPromo';
import { getMostRead, getPoll } from '@/lib/api/wordpress';
import { getMarketSnapshot } from '@/lib/api/market';


export async function Aside() {
  const [mostRead, poll, markets] = await Promise.all([
    getMostRead(5),
    getPoll(),
    getMarketSnapshot(),
  ]);
  return (
    <div className="space-y-6">
      <MostRead posts={mostRead} />
      <PollWidget poll={poll} />
      <GamesPromo />
      {markets.length > 0 && <MarketTicker items={markets} />}
      <SponsoredPromo />
    </div>
  );
}
