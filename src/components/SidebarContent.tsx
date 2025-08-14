import { GamesPromo } from './aside/GamesPromo';
import { MostRead } from './aside/MostRead';
import { PollWidget } from './aside/PollWidget';
import { SponsoredPromo } from './aside/SponsoredPromo';
import { MarketTicker } from './home/MarketTicker';

import { getMostRead, getPoll } from '@/lib/api/wordpress';
import { getMarketSnapshot } from '@/lib/api/market';

/**
 * SidebarContent
 * - Centralized sidebar layout using standardized widgets
 * - Mobile-first: renders full width on small screens, becomes a sidebar on lg+
 * - Renders sidebar widgets in recommended order
 */
export async function SidebarContent() {
  const [mostRead, poll, markets] = await Promise.all([
    getMostRead(5),
    getPoll(),
    getMarketSnapshot(),
  ]);

  return (
    <aside className="space-y-6">
      <MostRead posts={mostRead} />
      <PollWidget poll={poll} />
      <GamesPromo />
      {markets.length > 0 && <MarketTicker items={markets} />}
      <SponsoredPromo />
    </aside>
  );
}

export default SidebarContent;
