# Newsletter capture & audience journey (NOA-129)

The first newsletter product for News on Africa — the sign-up promise, where we
capture, how subscribers are stored and attributed, the weekly structure, and how
leads route into Studio 2411 / Ticketiv. Owned-audience capture is built and live
(first-party in Supabase); the sending/ESP layer is a documented decision below.

> Positions NoA as a distribution + lead-gen asset (AGENCY-31), leading with
> Business/Markets and Culture/Creative Economy.

## 1. Product & sign-up promise

**The Africa brief, weekly** — "Business, markets and the creative economy — the
stories that matter, once a week." One concise weekly email; no spam; unsubscribe
any time. This copy ships in the footer capture form.

## 2. Capture locations

Live now:
- **Global footer** (`components/newsletter-signup.tsx` in `SiteFooter`) — present
  on every page, tagged `source="footer"`.

Defined / recommended next (each just drops in `<NewsletterSignup>` with its own
`source`/`vertical`/`edition`, so attribution is automatic):
- **End of article** — highest intent; pass `vertical` = the article's primary
  category, `edition` = the article's edition.
- **Home / edition hero rail** — a compact inline unit.
- **Post-onboarding** (`/account/onboarding`) — offer the brief after sign-up.
- **Business & Culture vertical pages** — vertical-specific promise + `vertical` tag.

## 3. Subscriber storage (selected)

**First-party in Supabase** — `public.newsletter_subscribers`
(migration `20260711010000_newsletter_subscribers.sql`). Chosen for an **owned
audience with no ESP lock-in**: we control the list and can sync it to whichever
email platform is picked later.

- Writes go **only** through the service-role server action
  (`lib/newsletter/actions.ts`) — validated (`lib/newsletter/validation.ts`) and
  rate-limited per IP (`newsletter:signup`). The table has **no client RLS
  policies**, so anon/authenticated cannot read or write it (same rule as
  NOA-143). Sign-up is idempotent (unique on `lower(email)`).
- Columns: `email`, `status` (`pending`/`confirmed`/`unsubscribed`),
  `edition_code`, `source_vertical`, `source_campaign`, `source_path`,
  `metadata`, timestamps (`created_at`, `confirmed_at`, `unsubscribed_at`).

**Sending/ESP** is a separate decision (see §7): the ESP handles delivery,
double-opt-in confirmation, and unsubscribe; this table stays the source of truth
and syncs to it.

## 4. Source tracking

Every capture point carries attribution, stored on the subscriber row:

| Field | Meaning | Example |
| ----- | ------- | ------- |
| `source_path` | where they signed up | `footer`, `/sz/article/...` |
| `source_vertical` | editorial/commercial vertical | `business`, `culture` |
| `source_campaign` | campaign tag (utm-style) | `launch-sz` |
| `edition_code` | edition context | `sz` / `za` / `ng` |

Reporting is a straight `group by` (subscribers by vertical, campaign, edition,
over time) — feeds the audience-growth metrics in
[audience-metrics.md](./audience-metrics.md).

## 5. Weekly newsletter structure

1. **3–5 headline stories** (across editions, business/culture-led).
2. **One business / markets insight.**
3. **One culture / creative-economy feature.**
4. **Upcoming events / Ticketiv-linked opportunities.**
5. **Sponsor slot / partner message** (§7 disclosure).
6. **CTA:** work with Studio 2411, or list an event on Ticketiv, where relevant.

Content sourcing leans on the existing `content_index` (headlines by
edition/category) so the weekly can be assembled from indexed articles.

## 6. Lead routing to Studio 2411 & Ticketiv

The newsletter is a lead pathway, not just distribution:

- **Ticketiv** — the events/opportunities block and any "list your event" CTA
  link to Ticketiv with campaign tags; event-interest clicks are attributable via
  `source_campaign`. Enterprise/event profiles in the newsletter link through.
- **Studio 2411** — the "work with Studio 2411" CTA routes to a Studio 2411
  intake (form/URL) with a `source=noa-newsletter` tag so leads are traceable to
  the newsletter.

**Decision needed (business):** the concrete intake endpoints/CRM for each
(a form URL, a CRM inbox, or an API). Until those exist, CTAs are tagged links;
wiring them into a CRM is a follow-up (§8).

## 7. Newsletter sponsorship inventory

Aligns with the commercial model in [commercial-content.md](./commercial-content.md):

| Unit | Placement | Disclosure |
| ---- | --------- | ---------- |
| Presenting sponsor | "brought to you by [Brand]" at the top | `Sponsored by [Brand]` |
| Sponsor slot | dedicated block mid-newsletter | `Advertisement` / `Sponsored` |
| Partner message | native-style block, clearly labelled | `Paid partnership` |
| Section sponsor | e.g. "Markets, sponsored by [Brand]" | `Sponsored by [Brand]` |

One presenting sponsor + one sponsor slot per weekly send per edition to start;
pricing/rate card is a business decision (see commercial-content.md).

## 8. Business decisions & follow-ups

Built here: the capture form, storage, validation, rate-limiting, and source
tracking. Remaining (filed as follow-ups):

- **Select the ESP / sending platform** and sync `newsletter_subscribers` to it;
  add **double opt-in confirmation** (`pending` → `confirmed`) and an
  **unsubscribe** flow (`status = unsubscribed`).
- **Wire CRM lead-routing** endpoints for Studio 2411 and Ticketiv.
- **Weekly content workflow** sign-off (who curates, send cadence/day).
- Optional: an admin view of subscriber counts by source (builds on §4).

Owner sign-off needed on: the sign-up promise copy, the weekly structure, ESP
choice, sponsorship pricing, and the Studio 2411 / Ticketiv intake targets.
