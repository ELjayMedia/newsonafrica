/**
 * Small, dependency-free date formatting helpers shared by the reading
 * experience (NOA-89..92). Pure functions — safe to use in both server and
 * client components without pulling in a date library.
 */

const DISPLAY_TIME_ZONE = "Africa/Mbabane";
const DEFAULT_CMS_OFFSET = "+02:00";
const HAS_TIMEZONE_SUFFIX = /(?:z|[+-]\d{2}:?\d{2})$/i;
const RELATIVE_DATE_CUTOFF_SECONDS = 24 * 60 * 60;

function parseDisplayDate(value: string | Date): Date {
  if (value instanceof Date) return value;

  const trimmed = value.trim();
  const normalized =
    trimmed.includes("T") && !HAS_TIMEZONE_SUFFIX.test(trimmed)
      ? `${trimmed}${DEFAULT_CMS_OFFSET}`
      : trimmed;

  return new Date(normalized);
}

/** `2026-07-02` -> `2 July 2026`. Falls back to the raw string if unparseable. */
export function formatDate(value: string | Date): string {
  const date = parseDisplayDate(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: "year", seconds: 31536000 },
  { unit: "month", seconds: 2592000 },
  { unit: "week", seconds: 604800 },
  { unit: "day", seconds: 86400 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
];

/** `2026-07-02T10:00:00Z` -> `3 hours ago` (relative to `now`, defaults to `Date.now()`). */
export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const date = parseDisplayDate(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds >= RELATIVE_DATE_CUTOFF_SECONDS) return formatDate(value);

  if (absSeconds < 60) return "just now";

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (absSeconds >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return rtf.format(Math.round(diffSeconds / 60), "minute");
}
