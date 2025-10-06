"use client"

import type { WordPressPost } from "@/lib/wordpress-api"

import { MoreForYouSection } from "./MoreForYouSection.client"

interface MoreForYouShellProps {
  countryCode: string
  initialData?: {
    posts: WordPressPost[]
    hasNextPage: boolean
    endCursor: string | null
  }
}

export const MoreForYouShell = ({
  countryCode,
  initialData,
}: MoreForYouShellProps) => {
  return <MoreForYouSection countryCode={countryCode} initialData={initialData} />
}

export default MoreForYouShell
