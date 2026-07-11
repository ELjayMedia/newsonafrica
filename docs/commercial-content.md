# Commercial content packages & disclosure standards (NOA-27)

The initial commercial model for News on Africa: what sponsors can buy, how it
must be labelled, where it runs, how advertisers are onboarded, and what we must
be able to report. This is the business/editorial layer; the **mobile display-ad
UX rules** live in [mobile-ad-behavior.md](./mobile-ad-behavior.md) and the
in-code ad primitives are described in [§5](#5-technical-state--requirements).

> **Grounding.** Written against the current rebuild (verified 2026-07-11). The
> stack already treats advertising as "a first-class, clearly-labelled citizen"
> (design system §05): `components/ads/ad-slot.tsx` (IAB display units),
> `components/ads/takeover-skin.tsx` (home takeover), and
> `components/home/sponsored-card.tsx` (in-feed native with a gold "SPONSORED" +
> "Paid partnership" label). These render today as **labelled placeholders** —
> real creative/CMS wiring is the follow-up work in §5. Earlier NOA-27 planning
> referenced pre-rebuild paths (`ArticleCard.tsx`, `types/wpgraphql.ts`,
> `lib/entitlements.ts`, Paystack) that don't match the current tree; the
> reconciled, accurate technical picture is in §5.

## Editorial separation (the non-negotiable)

Commercial content must never override newsroom judgment. Sponsors may buy
**clearly labelled** placements, section ownership, or branded/native packages —
but independent editorial coverage stays controlled by NOA editors. Every
package below inherits this rule.

## 1. Package model

| # | Package | What it is | Disclosure label |
| - | ------- | ---------- | ---------------- |
| 1 | **Display advertising** | Standard IAB units (billboard, leaderboard, MPU, half-page) and the home **takeover skin** | `Advertisement` |
| 2 | **Sponsored article / native feature** | A paid article produced or edited to NOA standards; still useful to the reader, not a press release | `Sponsored` / `Paid partnership with [Brand]` |
| 3 | **Section / vertical sponsorship** | Sponsor owns a vertical or country-edition section for a defined period (e.g. "Markets & Money, sponsored by [Brand]") | `Sponsored by [Brand]` |
| 4 | **Partner series** | Multi-article campaign around a theme (SME growth, digital payments, women in business, climate adaptation) | `Partner Series with [Brand]` |
| 5 | **Homepage / edition takeover** | Time-limited high-visibility sponsor placement on home or a country edition (the takeover skin) | `Advertisement` + sponsor name |
| 6 | **Future inventory** | Newsletter sponsorship, podcast/video, event coverage, research/special-report sponsorship | per type |

Tiering (entry → premium) maps roughly: Package 1/2 = entry, 3/4 = mid, 5 =
premium. **Pricing and a rate card are a business decision** (owner: sales) and
are intentionally not fixed here.

## 2. Disclosure standards

Labels align with SA ASA, Nigerian APCON, and Eswatini media guidance, and must
appear **before the reader engages deeply** — on the home/feed card, in the
article header near the byline, on the section header, and on any
newsletter/social cut-downs.

| Label | When |
| ----- | ---- |
| **Advertisement** | Display ad units and standard placements (already the `AdSlot` micro-label) |
| **Sponsored by [Brand]** | Paid sponsorship around a section, article, or placement |
| **Paid partnership with [Brand]** | Brand involved in funding or distribution (already the `SponsoredCard` disclosure) |
| **Partner Series** | Recurring branded/supported series |
| **Supported by [Brand]** | Funding support exists but editorial independence is preserved |

**Rules**

1. Commercial labels must be **visually distinct from editorial category badges**
   (the code uses a dedicated gold/amber treatment, not the editorial `Badge`).
2. On a sponsored article the label sits **near the headline/byline**, and on
   every feed card **above/with the card** — never buried below the fold.
3. Footer/disclosure copy on sponsored articles states the advertiser, the nature
   of the relationship, and links to the **NOA advertising policy page**
   (to be created — see §5/business items).
4. Sponsored content must remain **freely accessible** — never gated. (There is
   no subscriber/premium paywall in the current rebuild, so this is a
   forward-looking guardrail, not a live risk.)
5. Whether sponsored articles appear in organic **search** results is an
   editorial-policy decision to confirm before launch (they are indexed in
   `content_index` like any post; a tag-based exclusion is trivial to add if
   wanted — see §5c).

## 3. Inventory & placement map

Grounded in the real components; mobile behaviour follows
[mobile-ad-behavior.md](./mobile-ad-behavior.md).

| Placement | Surface / component | Notes |
| --------- | ------------------- | ----- |
| Billboard / leaderboard | `AdSlot` (home top) | Desktop only — **hidden on the first mobile viewport** (no ad before content) |
| Mid-rail MPU (300×250) | `AdSlot` | Not rendered in the mobile in-feed flow |
| Half-page (300×600) sticky | `AdSlot` (right rail) | Desktop rail |
| Home takeover skin | `TakeoverSkin` | Home routes only, ≥1440px; skin + billboard sold as one premium buy |
| In-feed native | `SponsoredCard` (home/country feed) | Mobile: first after 4 editorial rows, a 2nd only on deep feeds (≥14 stories, after 11 rows) |
| In-article native | article body | Inserted **after paragraph 4**; a 2nd only on long reads (≥800 words / ≥9 paras) |
| Section / vertical sponsor strip | category header | **Needs building** (see §5) |
| Newsletter / podcast / events | — | Future inventory |
| Search / Saved / Auth flows | — | Keep utility screens clean — avoid intrusive advertising |

## 4. Advertiser onboarding workflow

1. **Brief & proposal** — sales collects brand, goal, target edition/vertical,
   duration, budget.
2. **Contract & payment** — agreement signed; payment collected. *(Payment
   provider is a business/tech decision: Paystack exists only under `legacy/` and
   is not wired into the current rebuild — confirm the mechanism before launch.)*
3. **Creative submission** — copy, images (≥1280×720), logo (SVG preferred), and
   any required disclosure copy; deadline ~5 business days before go-live.
4. **Editorial review** — NOA editors review for accuracy, disclosure compliance,
   and brand safety; approve/revise within ~48h.
5. **Publish** — article published in the edition's WordPress with the correct
   category and the sponsor metadata/label (see §5a). The
   [editorial webhook](./editorial-workflow.md) revalidates caches and syncs
   `content_index` automatically.
6. **QA on site** — confirm the label renders on the article page, feed cards, and
   (if included) search; confirm nothing is gated.
7. **Live & report** — send the advertiser a preview URL; track delivery and
   engagement (see §4 reporting + NOA-30 metrics).
8. **End of campaign** — article stays in archive; remove from active
   home/section placements; produce a post-campaign report.

## 4b. Reporting requirements

Each paid placement should be able to report: placement **dates**, **edition &
vertical**, **impressions**, **clicks / CTR**, **article views** for sponsored
stories, engagement actions where relevant, and **delivery vs booked inventory**.

**Reality check:** the rebuild has **no ad/sponsor event logging today** —
impressions and clicks are not captured, and there is no analytics provider (same
gap family as NOA-30 / NOA-138). Sponsored-article *views* likewise depend on the
page-view instrumentation that doesn't yet exist. So campaign reporting is
**blocked on instrumentation**, captured as a follow-up in §5.

## 5. Technical state & requirements

**What exists (labelled placeholders, ready for real wiring):**

- `AdSlot` — billboard / leaderboard / MPU / half-page IAB frames, each with an
  "Advertisement" micro-label; drop-in for a real ad server (GPT/Prebid).
- `TakeoverSkin` — the premium home takeover canvas.
- `SponsoredCard` — in-feed native with gold "SPONSORED · [advertiser]" + "Paid
  partnership" disclosure. **Currently demo/hardcoded props**, not CMS-driven.
- Mobile ad-density and placement rules ([mobile-ad-behavior.md](./mobile-ad-behavior.md)).

**What needs building (→ follow-up tickets):**

- **(a) CMS-driven sponsor metadata + data-driven disclosure labels.** Add
  WordPress custom fields (`is_sponsored`, `sponsor_name`, `sponsor_tier`,
  `disclosure_label`, `campaign_id`), expose them via WPGraphQL, map them onto the
  DAL `Post` type, and render a real sponsored label near the article
  headline/byline and on feed cards — so `SponsoredCard` and sponsored articles
  are driven by real data instead of demo props.
- **(b) Sponsor / ad event logging.** Capture impressions and clicks per
  placement (edition, vertical, campaign) to make the §4b reporting possible.
  Overlaps the analytics decision in NOA-138.
- **(c) Section / vertical sponsor slot.** A sponsor strip in the category header
  driven by sponsorship config (WP option/taxonomy), for Package 3.
- **(d) Advertiser report template** built on (b).

**§5c — search inclusion (policy toggle).** Sponsored posts sync into
`content_index` like any article and are identifiable by tag:

```sql
select * from public.content_index
where 'sponsored-content' = any(tags) or 'advertiser-feature' = any(tags);
```

The existing GIN index on `tags` serves this — **no schema change**. If policy is
to exclude them from organic search, add `and not ('sponsored-content' = any(tags))`
to the `search_content()` function. Confirm the editorial call before launch.

**Business items (owner: sales/editorial, not code):** tier pricing + rate card,
sponsorship agreement template, payment provider, newsletter cadence/slots, and
the **NOA advertising policy page** that disclosure footers link to.

## Summary

- Six-package model, all inheriting the editorial-separation rule; pricing is a
  business decision.
- Disclosure taxonomy is defined and **already partly implemented** in the design
  system ("Advertisement" on display, "SPONSORED / Paid partnership" on native).
- Inventory maps to real components; mobile UX is governed by the existing
  mobile-ad standard.
- The gating dependency for launch-quality commercial content is
  **instrumentation** (CMS sponsor fields + ad-event logging) — raised as
  follow-ups, not blockers to documenting the model.
