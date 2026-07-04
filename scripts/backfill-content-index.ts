#!/usr/bin/env node
/**
 * Backfill Content Index Script (NOA-87)
 *
 * Pages through every WordPress post for one or all countries and upserts
 * it into the Supabase `content_index` via the guarded admin API route
 * (`/api/admin/content-sync/backfill`). Run this after applying the
 * content_index migration, after a bulk WordPress import, or to repair a
 * drifted index.
 *
 * This talks to a *running* instance of the app (dev or deployed) rather
 * than importing server-only DAL/Supabase modules directly, since
 * `import "server-only"` unconditionally throws outside the Next.js build
 * (its package.json only maps to a no-op under the "react-server"
 * condition). Point --base-url at whichever environment you want to
 * backfill.
 *
 * Usage:
 *   pnpm content-sync:backfill [--country=sz] [--per-page=50] [--base-url=http://localhost:3000]
 *
 * Requires CONTENT_SYNC_SECRET in the environment, matching the value the
 * target deployment validates in lib/content-sync/admin-auth.ts.
 */

// Keep in sync with lib/wordpress/countries.ts SUPPORTED_COUNTRY_CODES —
// duplicated here so this script doesn't have to import a "server-only"
// module (see file header).
const SUPPORTED_COUNTRY_CODES = ["sz", "za", "ng"] as const;

interface CliOptions {
  country?: string;
  perPage: number;
  baseUrl: string;
}

interface BackfillPageResponse {
  country: string;
  page: number;
  perPage: number;
  fetched: number;
  synced: number;
  hasNextPage: boolean;
  total: number;
  status: string;
  errors: Array<{ message: string; slug?: string; wpPostId?: number }>;
  error?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { perPage: 50, baseUrl: process.env.BACKFILL_BASE_URL ?? "http://localhost:3000" };

  for (const arg of argv) {
    if (arg.startsWith("--country=")) options.country = arg.slice("--country=".length);
    else if (arg.startsWith("--per-page=")) options.perPage = Number.parseInt(arg.slice("--per-page=".length), 10) || 50;
    else if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
  }

  return options;
}

async function backfillCountry(country: string, { perPage, baseUrl }: CliOptions, secret: string): Promise<void> {
  console.log(`\nBackfilling ${country.toUpperCase()} (per-page: ${perPage})`);

  let page = 1;
  let totalSynced = 0;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(`${baseUrl}/api/admin/content-sync/backfill`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-content-sync-secret": secret,
      },
      body: JSON.stringify({ country, page, perPage }),
    });

    const payload = (await response.json()) as BackfillPageResponse;

    if (!response.ok) {
      console.error(`  Page ${page} failed: ${payload.error ?? response.statusText}`);
      process.exitCode = 1;
      return;
    }

    totalSynced += payload.synced;
    console.log(`  Page ${page}: synced ${payload.synced}/${payload.fetched} (running total ${totalSynced}/${payload.total})`);

    if (payload.errors.length > 0) {
      for (const err of payload.errors) {
        console.warn(`    ! ${err.slug ?? err.wpPostId ?? "unknown"}: ${err.message}`);
      }
    }

    hasNextPage = payload.hasNextPage;
    page += 1;
  }

  console.log(`Completed ${country.toUpperCase()}: ${totalSynced} posts synced`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const secret = process.env.CONTENT_SYNC_SECRET;

  if (!secret) {
    console.error("Error: CONTENT_SYNC_SECRET must be set in the environment");
    process.exit(1);
  }

  const countries = options.country ? [options.country] : Array.from(SUPPORTED_COUNTRY_CODES);

  console.log("News on Africa - Content Index Backfill");
  console.log("========================================");
  console.log(`Target: ${options.baseUrl}`);
  console.log(`Countries: ${countries.join(", ")}`);

  for (const country of countries) {
    await backfillCountry(country, options, secret);
  }

  console.log("\nBackfill complete.");
}

main().catch((error) => {
  console.error("\nBackfill failed:", error);
  process.exit(1);
});
