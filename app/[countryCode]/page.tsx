import { notFound } from "next/navigation"

import { HomeContent } from "@/components/HomeContent"
import {
  HOME_FEED_REVALIDATE,
  buildHomeContentPropsForEdition,
} from "../(home)/home-data"
import { SUPPORTED_EDITIONS } from "@/lib/editions"
import { getSiteBaseUrl } from "@/lib/site-url"

export const revalidate = 60

if (process.env.NODE_ENV !== "production" && revalidate !== HOME_FEED_REVALIDATE) {
  throw new Error(
    `Country home feed revalidate interval mismatch: page=${revalidate}, data=${HOME_FEED_REVALIDATE}`,
  )
}

type Props = { params: { countryCode: string } }

export default async function CountryPage({ params }: Props) {
  const { countryCode } = await params
  const slug = countryCode.toLowerCase()
  const edition = SUPPORTED_EDITIONS.find(({ code }) => code === slug)

  if (!edition) {
    return notFound()
  }

  const baseUrl = getSiteBaseUrl()
  const { initialPosts, featuredPosts, countryPosts, initialData } =
    await buildHomeContentPropsForEdition(baseUrl, edition)

  return (
    <HomeContent
      initialPosts={initialPosts}
      featuredPosts={featuredPosts}
      countryPosts={countryPosts}
      initialData={initialData}
    />
  )
}
