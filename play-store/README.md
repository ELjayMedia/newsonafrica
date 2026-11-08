# Google Play listing source

`listings/en-US.json` is the source for the app title, short description and
full description. Add another language as a JSON file with the same three
fields. Limits are 30, 80 and 4000 characters respectively.

Validate and print the exact listing plan without credentials or network access:

```sh
node scripts/publish-google-play-listing.mjs
```

The **Google Play Listing** workflow runs this validation on pull requests.
Manual runs default to `dry_run: true` and upload a `google-play-listing-plan`
artifact for review. After merging, run it on `main` with `dry_run: false` to
publish the text. Publishing uses the repository's `GOOGLE_SERVICE_ACCOUNT_KEY`
secret, which needs permission to manage the app's store presence. It creates
an edit, patches text, validates the edit and commits it. Check Play Console
afterward for review or managed-publishing status.

This workflow does not upload a bundle, change a track, or change the data-safety,
ads, pricing, contact, privacy-policy or content-rating declarations. Review
those in Play Console using [the content pack](../docs/play-store-listing.md).

## Graphics

Text publishing preserves the images already in Google Play. The previously
prepared feature graphic and phone screenshots were referenced on a developer's
Mac and are **not in this repository**. Import the actual reviewed images before
enabling graphics publishing; do not substitute generated or placeholder app
screenshots.

For each listing language, provide the complete packet:

```text
play-store/graphics/en-US/
  icon.png                       # 512 × 512 RGB/RGBA PNG
  featureGraphic.png             # 1024 × 500 RGB PNG, no alpha
  phoneScreenshots/
    01-home.png
    02-article.png
    ...                          # 2–8 PNGs, sorted by filename
```

Use 8-bit RGB/RGBA PNGs. Screenshot dimensions must be 320–3840 pixels. Capture
the current release-signed app on a device; recommended screens are home,
article, search, privacy policy and account deletion. The existing
`public/icons/icon-512.png` can be reviewed for reuse as `icon.png`.

Validate the full graphics packet locally:

```sh
node scripts/publish-google-play-listing.mjs --upload-graphics
```

Then select `upload_graphics: true` in a dry-run workflow and review the artifact.
A publishing run with that option replaces the icon, feature graphic and phone
screenshots inside one edit. Missing or invalid assets fail before contacting
Google Play. Other graphic types, such as tablet screenshots, are preserved.
