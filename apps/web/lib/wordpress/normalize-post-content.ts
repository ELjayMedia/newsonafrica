import "server-only"

import { normalizePostContent } from "@/lib/wordpress/normalize"

export function normalizeWordPressPostContent(content: string, countryCode?: string): string {
  return normalizePostContent(content, countryCode ?? "sz")
}
