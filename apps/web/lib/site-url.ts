import { siteConfig } from "@/config/site"

const DEFAULT_SITE_URL = "https://app.newsonafrica.com"

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "")

const resolvedSiteUrl = siteConfig.url && siteConfig.url.length > 0 ? siteConfig.url : DEFAULT_SITE_URL

export const SITE_BASE_URL = normalizeBaseUrl(resolvedSiteUrl)

export const getSiteBaseUrl = (): string => SITE_BASE_URL
