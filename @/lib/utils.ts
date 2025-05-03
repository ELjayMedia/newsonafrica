import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function insertAdsInContent(content: string, adCount = 3): string {
  if (!content) return ""

  // Split content by paragraph tags
  const paragraphs = content.split("</p>")
  const totalParagraphs = paragraphs.length

  // Calculate ad positions - place ads after paragraphs 3, 7, and 11 if they exist
  const adPositions = []
  if (totalParagraphs >= 4) adPositions.push(3)
  if (totalParagraphs >= 8) adPositions.push(7)
  if (totalParagraphs >= 12) adPositions.push(11)

  // Insert ad placeholder divs
  adPositions.forEach((position, index) => {
    if (index < adCount) {
      paragraphs.splice(position + index, 0, `<div class="ad-placeholder" data-ad-index="${index}"></div>`)
    }
  })

  return paragraphs.join("</p>")
}
