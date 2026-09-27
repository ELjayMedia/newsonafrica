# Commercial content packages & disclosure standards (NOA-27)

The initial commercial model for News on Africa: what sponsors can buy, how it
must be labelled, where it runs, how advertisers are onboarded, and what we must
be able to report. This is the business/editorial layer; the **mobile display-ad
UX rules** live in [mobile-ad-behavior.md](./mobile-ad-behavior.md) and the
in-code ad primitives are described in [§5](#5-technical-state--requirements).

> **Grounding.** Reconciled against the current rebuild on **27 September 2026**
> under NOA-178. The stack treats advertising as a first-class, clearly-labelled
> citizen: `AdSlot`, `TakeoverSkin` and `SponsoredCard` define the core
> display/native surfaces. Unfilled production inventory now **collapses by
> default**; demo creative must never masquerade as a paid campaign. Sponsor/ad
> event logging (NOA-142) and first-party page-view measurement (NOA-138) now
> exist. Revive trafficking, the full sponsored-story template and advertiser
> reporting remain P1/P2 work.

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
are intentionally not fixed here. Until buyer validation is complete, quote
pricing case-by-case rather than publishing unsupported rates.

### 1b. Operational inventory catalogue

| SKU | Product | Creative / delivery specification | Primary measurement | Readiness |
| --- | --- | --- | --- | --- |
| NOA-DSP-BB | Billboard | 970×250 desktop; may collapse to 728×90 | impressions, clicks, CTR | inventory defined; automated trafficking P2 |
| NOA-DSP-MPU | MPU | 300×250 | impressions, clicks, CTR | inventory defined; automated trafficking P2 |
| NOA-DSP-HP | Half-page | 300×600 desktop rail | impressions, clicks, CTR | inventory defined; automated trafficking P2 |
| NOA-HOME-TKO | Homepage / edition takeover | skin + billboard bundle | impressions, clicks, CTR, dates | premium inventory defined; Revive P2 |
| NOA-NAT-STORY | Sponsored story | article + feed disclosure + optional CTA | article views, CTA clicks, engaged metrics where available | sponsor metadata foundation built; template P1 |
| NOA-VERT-SP | Vertical sponsorship | category/vertical ownership strip + agreed supporting units | section views, unit delivery, clicks | product defined; sponsor strip still required |
| NOA-PARTNER | Partner series | multiple clearly-disclosed stories under one campaign identity | story views, campaign delivery, CTA clicks | product defined; template/reporting P1 |
| NOA-NL-SP | Newsletter sponsorship | labelled newsletter placement | sends, delivered/open/click metrics supported by ESP | P2 after newsletter sending is activated |

Every booking needs: campaign ID, advertiser, product/SKU, edition/vertical,
start/end dates, booked delivery or duration, creative owner, disclosure label,
destination URL (if any), and reporting owner.

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

**Current state (27 September 2026):** NOA-142 provides service-role-only
campaign impression/click event storage and campaign summaries. NOA-138 now
provides privacy-safe first-party page views (pathname, edition/content type,
coarse device class, external referrer hostname and a random browser-session ID).
The remaining gap is the **buyer-facing reporting layer** that joins campaign
delivery to sponsored-story readership; that work is NOA-183.

## 5. Technical state & requirements

**What exists now:**

- `AdSlot` — billboard / leaderboard / MPU / half-page IAB frames. Unfilled
  production slots collapse; an explicit campaign/preview must enable inventory.
- `TakeoverSkin` — premium home takeover canvas, disabled by default unless
  explicitly activated.
- `SponsoredCard` — native surface that no longer falls back to fictional
  advertiser copy.
- NOA-141 sponsor metadata foundation and NOA-142 campaign-event foundation.
- NOA-138 first-party page-view measurement.
- Public `/advertise` proposition + qualified commercial enquiry capture.
- Mobile ad-density and placement rules ([mobile-ad-behavior.md](./mobile-ad-behavior.md)).

**What still needs building (→ active commercial-readiness tickets):**

- **(a) Capability-aware sponsor metadata + sponsored-story template (NOA-182).**
  The sponsor schema exists conceptually and in parts of the DAL, but optional
  WPGraphQL extensions must never be allowed to break the core article feed.
- **(b) Section / vertical sponsor slot.** A sponsor strip in the category header
  driven by sponsorship config for Package 3.
- **(c) Advertiser reporting (NOA-183).** Join NOA-142 campaign events with
  NOA-138 readership signals into a buyer-safe view/export.
- **(d) Demo campaign (NOA-184).** Prove briefing → preview → delivery → tracking
  → reporting before claiming the workflow is repeatable.
- **(e) Revive delivery automation (NOA-185).** Replace manual/preview enablement
  with campaign-controlled trafficking and safe fallback behaviour.

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
- The instrumentation foundation now exists. The next commercial proof is a
  complete sponsored template + advertiser report + demo campaign, followed by
  Revive/CRM/workflow automation only after that proof.
