# 0005. Per-country editions via URL prefix and dedicated WP endpoints

- Status: Accepted
- Date: 2026-04-16

## Context

Each country edition (Eswatini, South Africa, Nigeria) is editorially
independent: different WordPress installs, different author rosters,
different homepages, occasionally different taxonomies. We need a URL
structure that:

- Lets a reader deep-link to any edition.
- Makes the active edition explicit in every server request so cache
  tags and analytics can key off it.
- Supports adding a new edition in exactly one place.

## Decision

- The active edition is carried on the URL as the first path segment:
  `/[countryCode]/...` where `countryCode` is one of the values in
  `SUPPORTED_COUNTRY_CODES` (`sz`, `za`, `ng`).
- Each edition points to its own WPGraphQL endpoint resolved from
  `NEXT_PUBLIC_WP_{CODE}_GRAPHQL` env vars by `getGraphQLEndpoint` in
  `lib/countries.ts`.
- `CountryCode` is derived from `SUPPORTED_COUNTRY_CODES as const`, so
  adding a new edition requires editing exactly that list — the type,
  the validator, and downstream consumers update automatically.
- Country-agnostic surfaces (e.g. `/tag/[slug]`, `/author/[slug]`) live
  outside the `[countryCode]` segment.

## Consequences

- **Wins:** URL clearly identifies the edition; cache tags and logs can
  include the country code; no subdomain sprawl; no runtime header
  sniffing; adding a new edition is a one-line + env-var change.
- **Costs:** Country-agnostic surfaces have to be kept explicitly
  outside the `[countryCode]` segment, which sometimes feels
  inconsistent. We accept that in exchange for predictable routes.
- Reader geolocation is not used for routing — redirects from `/` land
  on a default edition (`NEXT_PUBLIC_DEFAULT_SITE`) with a visible
  switcher. This is deliberate: geo-routing opaquely can surprise VPN
  users.

## Alternatives considered

- **Subdomains per edition (`sz.news...`):** Complicates Supabase auth
  cookies and CDN config. Rejected.
- **Country as a query param:** Poor for SEO and caching. Rejected.
- **Single WP install with country taxonomy:** Wouldn't match existing
  editorial workflows, which run on separate installs per country.
  Rejected.
