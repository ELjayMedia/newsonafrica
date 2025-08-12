import { getMostRead, getPoll, getMarketSnapshot } from '@/lib/api/wordpress'
import { MostRead } from '@/components/aside/MostRead'
import { PollWidget } from '@/components/aside/PollWidget'
import { GamesPromo } from '@/components/aside/GamesPromo'
import { MarketTicker } from './MarketTicker'

export async function Aside() {
  const [mostRead, poll, markets] = await Promise.all([
    getMostRead(5),
    getPoll(),
    getMarketSnapshot(),
  ])
  return (
    <div className="space-y-6">
      <MarketTicker items={markets} />
      <MostRead posts={mostRead} />
      <PollWidget poll={poll} />
      <GamesPromo />
    </div>
  )
}
