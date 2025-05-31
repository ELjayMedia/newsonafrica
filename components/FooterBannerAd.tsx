import { AdErrorBoundary } from "./AdErrorBoundary"
import { AdSense } from "./AdSense"

export function FooterBannerAd() {
  return (
    <div className="w-full my-4 flex justify-center">
      <AdErrorBoundary collapse={true}>
        {/* Desktop ad */}
        <AdSense
          slot="1357924680"
          format="horizontal"
          className="max-w-full overflow-hidden hidden md:block"
          minWidth={728}
        />

        {/* Mobile ad */}
        <AdSense slot="1357924680" format="rectangle" className="max-w-full overflow-hidden md:hidden" minWidth={300} />
      </AdErrorBoundary>
    </div>
  )
}
