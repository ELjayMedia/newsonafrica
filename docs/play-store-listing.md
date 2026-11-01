# Google Play listing & data-safety content pack (NOA-133)

The versioned store text is in
[`play-store/listings/en-US.json`](../play-store/listings/en-US.json). The
**Google Play Listing** workflow validates it and can publish a listing edit
separately from an Android app release. See [the workflow guide](../play-store/README.md)
for dry runs, publishing and importing graphic assets.

The questionnaire guidance below was originally reviewed on 2026-07-13 and
needs a fresh review against the current app and live sponsored content before
submission. Items only the Play Console account owner can confirm are marked
**[YOU]**. The workflow does not change these Console declarations.

---

## 1. Store listing — text

Edit title, short description and full description in
[`play-store/listings/en-US.json`](../play-store/listings/en-US.json). Local and
pull-request checks enforce Play's 30/80/4000 character limits. The JSON contains
the existing News on Africa copy; avoid maintaining another copy here.

**Category:** News & Magazines
**Tags/keywords:** African news, Eswatini news, South Africa news, Nigeria news,
business, culture

**[YOU] Contact details**

- Support email: `info@newsonafrica.com`
- In-app/public contact page: `https://app.newsonafrica.com/contact`
- Phone contacts: `+268 7696 7131`, `+27 83 942 793`
- Website: `https://app.newsonafrica.com` (after NOA-121)
- Privacy policy URL: `https://app.newsonafrica.com/privacy` (live — NOA-135)
- Account/data deletion URL: `https://app.newsonafrica.com/account-deletion`
- Editorial guidelines URL: `https://app.newsonafrica.com/editorial-guidelines`

## 2. Graphic assets

The previously prepared NOA-134 feature graphic and five phone screenshots
were referenced in a developer's local output folder and are **not available in
this repository**. Their existence or readiness cannot be established from the
repository. Import the actual reviewed files into
`play-store/graphics/en-US/` using [the required layout](../play-store/README.md#graphics).

- **App icon:** 512×512; review `public/icons/icon-512.png` for reuse.
- **Feature graphic:** 1024×500 RGB PNG without alpha.
- **Phone screenshots:** two to eight current device captures, named in display
  order. Recommended screens: home, article, search, privacy policy and account
  deletion.
- **Tablet screenshots:** optional; maintained in Play Console for now.

Text publishing preserves existing Play images. Enable `upload_graphics` only
after the complete packet passes a dry run. No placeholder app screenshots are
provided.

## 3. Data safety questionnaire

The original declaration described first-party collection stored in Supabase
and no third-party sharing, sale or third-party ad/analytics SDK. Reconfirm those
answers against current deployments and service providers. The current code
also records page views and sponsored-campaign impressions/clicks. API traffic
uses HTTPS/TLS.

| Data type (Play category)                       | Collected                  | Why                                   | What it is                                  |
| ----------------------------------------------- | -------------------------- | ------------------------------------- | ------------------------------------------- |
| **Name** (Personal info)                        | Yes (optional)             | App functionality, Account management | Profile display name                        |
| **Email address** (Personal info)               | Yes (required for account) | App functionality, Account management | Sign-in identity; newsletter                |
| **Photos** (Photos and videos)                  | Yes (optional)             | App functionality                     | Profile avatar you upload                   |
| **App interactions** (App activity)             | Yes                        | App functionality, Analytics          | Bookmarks; searches; page/campaign events   |
| **Search history** (App activity)               | Yes                        | Analytics, App functionality          | Search terms (logged without your identity) |
| **Other user-generated content** (App activity) | Yes                        | App functionality                     | Comments you post                           |

Before choosing data types, review the production page-view tracker and
sponsored article events: page path, coarse content/edition/device class,
external referrer hostname and a random per-tab session ID are sent to
first-party endpoints. Assess their Play categories, purposes, retention and
any collection/sharing exemptions; do not assume that "no ad SDK" answers these
questions.

The original "not collected" guidance covered precise/approximate location
(the profile country is self-selected), financial information, health/fitness,
private messages, contacts and calendar. Reconfirm it against the current app;
review browsing/activity and device/other ID answers in light of the events
above.

**Security section answers:**

- Is data encrypted in transit? **Yes.**
- Can users request that data be deleted? **Yes.** Use
  `https://app.newsonafrica.com/account-deletion`; signed-in users can delete
  their account from profile settings.
- Account features require account information. Browsing without an account
  does not by itself make analytics collection optional; confirm consent,
  collection behavior and the questionnaire answer against the deployed app.

## 4. Content rating questionnaire (IARC)

Answer honestly; IARC computes the rating. Guidance for a news app with UGC:

- App type: **News / information app.**
- Violence, sexual content, profanity, gambling, drugs **in the app's own
  content:** none — but news articles may reference real-world events. Answer the
  "does the app contain news/journalistic content" path truthfully.
- **User-generated content / user interaction:** **Yes** — readers post and reply
  to comments. This typically pushes the rating to **Teen**-equivalent and
  requires the moderation + reporting disclosures below.
- Users can share content: comments are visible to other users. Location sharing:
  **No.**

Expected outcome: a Teen-level rating (PEGI 12 / ESRB Teen or similar). Confirm
via the questionnaire result.

## 5. App content declarations

- **News app:** Yes — declare as a news app if prompted.
- **Published editorial guidelines:** Yes —
  `https://app.newsonafrica.com/editorial-guidelines`.
- **Associated with journalistic standards groups or initiatives:** No — do not
  claim membership unless the business confirms a real current affiliation.
- **User-generated content:** Yes. Moderation exists (`/account/admin/comments`
  — approve/hide/delete) and readers can **report** comments (NOA-23), which is
  the Play requirement for UGC apps. State that UGC is moderated and reportable.
- **Ads:** **[YOU] Review before submission.** The app now supports sponsored
  articles/campaigns and records impressions/clicks. Confirm current live content
  and Play's ads declaration; absence of a third-party ad SDK is insufficient
  to retain the old "No ads" answer automatically.
- **Target audience & age:** 13+; **not** directed at children. Do not opt into
  the Designed for Families programme.
- **App access:** Core reading is public; bookmarking, commenting and profile
  need a free account. Provide Play review with a **[YOU] test account**
  (email + password) so reviewers can exercise the gated features, or note that
  self-registration is open.
- **Data deletion:** provide `https://app.newsonafrica.com/account-deletion`.

## 6. ⚠️ Remaining Play Console/account-owner gaps

1. **Confirm release pricing**. The intended launch model is free; if Play
   Console is currently set to paid, switch it to free unless the account owner
   intentionally wants merchant-account/payment setup.
2. **Provide Play review access**: a review test account, or confirmation that
   self-registration is open and acceptable for review.
3. **Choose the release track**: internal, closed testing, open testing, or
   production.
4. **After AAB upload**, check Play Console -> Setup -> App integrity. If Google
   Play App Signing shows a different App signing certificate SHA-256 than the
   upload certificate, add that fingerprint to
   `public/.well-known/assetlinks.json`, deploy, and re-run Digital Asset Links
   verification.
5. **Import the real graphics packet** into `play-store/graphics/en-US/` before
   enabling image publishing, unless the existing Console assets are retained.
6. **Revalidate data safety and ads declarations** against current first-party
   analytics, sponsored content and live service-provider behavior.

---

A listing dry run verifies the local text and, when requested, the complete
local graphics packet. Publishing validates and commits a Google Play edit;
it does not establish that Play has approved or publicly published the listing.
Confirm review/managed-publishing status, questionnaire answers, reviewer access
and signing/Digital Asset Links in Play Console before declaring the release
ready.
