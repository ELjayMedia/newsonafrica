# Mobile Ad Behavior Standard

News On Africa should feel like a fast mobile news product that carries advertising, not an ad feed with stories inside it. Mobile ad behavior must protect reader trust, page speed, and editorial hierarchy while still creating credible inventory for sponsors.

## Product principles

1. **No ad before content on mobile.** The first mobile viewport must lead with editorial value.
2. **No popups, prestitials, or mobile interstitials.** Mobile advertising should never block navigation or reading.
3. **No bottom sticky units by default.** The mobile bottom navigation owns the thumb zone.
4. **Native ads beat box ads on mobile.** Sponsored placements should sit between content moments and be clearly labelled.
5. **Article ads appear after engagement.** Ads should not sit between the headline, excerpt, byline, hero image, and the start of the article.
6. **Ad density stays conservative.** Mobile feeds should stay well below a 30% ad-density ceiling.

## Current implementation

### Mobile home and country feeds

- Desktop still renders the billboard ad above the home layout.
- Mobile hides the top billboard so the first viewport is ad-free.
- Mobile feed shows the first native sponsored card only after four editorial story rows.
- Mobile feed shows a second native sponsored card only on deeper feeds with at least fourteen stories, after eleven editorial story rows.
- Mobile feed no longer renders the 300x250 MPU between story groups.

### Mobile article pages

- No ad is rendered before the article body.
- The first mobile sponsored placement is inserted after paragraph four.
- A second mobile sponsored placement is inserted only for long articles of at least 800 words and at least nine paragraphs.
- Desktop article rendering remains focused on the existing rail model.

## Removed / avoided mobile behavior

- Mobile top billboard before stories.
- Mobile in-feed MPU box.
- Sticky bottom ad behavior.
- Sponsored placement above article headlines, excerpts, bylines, hero images, or first paragraphs.

## QA checklist

- [ ] `/` on a mobile viewport opens with stories, not an ad.
- [ ] `/{countryCode}` on a mobile viewport opens with stories, not an ad.
- [ ] First mobile feed sponsored card appears only after four story rows.
- [ ] Mobile feed has no 300x250 MPU placeholder.
- [ ] Article page has no ad before headline, excerpt, byline, hero image, or first four paragraphs.
- [ ] Short articles render at most one mobile sponsored placement.
- [ ] Long articles render at most two mobile sponsored placements.
- [ ] Bottom navigation is never covered by an ad.
- [ ] Sponsored placements are visibly labelled.
