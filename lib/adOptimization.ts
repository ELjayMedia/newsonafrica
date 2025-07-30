export const adExclusionSelectors = [
  ".site-header", // Don't place ads in the header
  ".site-footer", // Don't place ads in the footer
  ".author-bio", // Don't place ads in author bios
  ".newsletter-signup", // Don't place ads in newsletter signup forms
  ".related-posts", // Don't place ads in related posts sections
  ".comment-form", // Don't place ads in comment forms
]

// Content optimization - ensure content is structured for optimal ad placement
export function optimizeContentForAds(content: string): string {
  // Ensure paragraphs have proper spacing for ad insertion
  const optimizedContent = content
    .replace(/<p>/g, '<p class="ad-friendly-paragraph">')

    // Add potential ad insertion points after every few paragraphs
    .replace(/<\/p>/g, '</p><div class="potential-ad-slot"></div>')

    // Ensure headings have space after them for potential ads
    .replace(/<\/h[2-6]>/g, '</h$1><div class="heading-spacing"></div>')

  return optimizedContent
}

// Helper to check if a page should have reduced ads
export function shouldReduceAds(path: string): boolean {
  // Pages where we want fewer ads
  const reducedAdPages = [
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/subscription",
    "/login",
    "/register",
  ]

  return reducedAdPages.some((page) => path.startsWith(page))
}

// Get recommended ad density based on content length
export function getRecommendedAdDensity(contentLength: number): "low" | "medium" | "high" {
  if (contentLength < 500) {
    return "low" // Short content should have fewer ads
  } else if (contentLength < 1500) {
    return "medium" // Medium content can have a moderate number of ads
  } else {
    return "high" // Long-form content can support more ads
  }
}
