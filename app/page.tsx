import { HomeContent } from "@/components/HomeContent"
import { getServerCountry } from "@/lib/utils/routing"
import { getSiteBaseUrl } from "@/lib/site-url"
import { getHomeContentSnapshot } from "./(home)/home-data"

export const dynamic = "force-static"
export const revalidate = false

export default async function Page() {
  const baseUrl = getSiteBaseUrl()
  const homeContent = await getHomeContentSnapshot(baseUrl)
  const currentCountry = getServerCountry()

  return <HomeContent {...homeContent} currentCountry={currentCountry} />
}
