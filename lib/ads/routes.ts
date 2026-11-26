import { isValidCountry } from "@/lib/countries";

/** The pan-African home (`/`) and each edition home (`/sz`, `/za`, …). */
export function isHomeRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  return segments.length === 1 && isValidCountry(segments[0]!);
}
