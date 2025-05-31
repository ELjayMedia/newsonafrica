import { AdComponent } from "./AdComponent"

export function HomeMidContentAd() {
  return (
    <div className="w-full flex justify-center">
      <div className="block md:hidden">
        <AdComponent zoneId="19" className="mt-4" />
      </div>
      <div className="hidden md:block">
        <AdComponent zoneId="13" className="mt-4" />
      </div>
    </div>
  )
}
