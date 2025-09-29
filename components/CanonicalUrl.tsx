import Head from "next/head"
import { siteConfig } from "@/config/site"

interface CanonicalUrlProps {
  path: string
}

export function CanonicalUrl({ path }: CanonicalUrlProps) {
  const canonicalUrl = `${siteConfig.url}${path}`

  return (
    <Head>
      <link rel="canonical" href={canonicalUrl} />
    </Head>
  )
}
