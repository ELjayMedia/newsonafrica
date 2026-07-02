/**
 * Persists the visitor's preferred country edition as a cookie (NOA-92),
 * mirroring the legacy app's `app/api/set-country` route. Read back by
 * `app/[countryCode]/layout.tsx` to show `CountryEditionNotice` when the
 * cookie disagrees with the edition currently being viewed.
 */
import { NextResponse, type NextRequest } from "next/server";

import { isValidCountry } from "@/lib/countries";

const SIX_MONTHS_IN_SECONDS = 15_552_000;

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const country =
    typeof payload === "object" && payload !== null ? (payload as { country?: unknown }).country : undefined;

  if (typeof country !== "string") {
    return NextResponse.json({ error: "Country is required" }, { status: 400 });
  }

  const normalized = country.trim().toLowerCase();

  if (!isValidCountry(normalized)) {
    return NextResponse.json({ error: "Unsupported country" }, { status: 400 });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: "country",
    value: normalized,
    maxAge: SIX_MONTHS_IN_SECONDS,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
