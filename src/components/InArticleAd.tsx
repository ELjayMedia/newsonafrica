import { AdComponent } from "./AdComponent"

interface InArticleAdProps {
  index: number
}

export function InArticleAd({ index }: InArticleAdProps) {
  const zoneId = index === 1 ? "14" : "15"
  return <AdComponent zoneId={zoneId} className="my-4" />
}
