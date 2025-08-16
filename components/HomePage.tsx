import { HomeAfterHeroAd } from "./HomeAfterHeroAd"
import { HomeMidContentAd } from "./HomeMidContentAd"
// ... other imports

export function HomePage() {
  return (
    <div>
      {/* Your hero section */}
      <HomeAfterHeroAd />
      {/* Some content */}
      <HomeMidContentAd />
      {/* More content */}
    </div>
  )
}
