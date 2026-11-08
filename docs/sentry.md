# Sentry for News on Africa

Use the Next.js project `eljaymedia-5k/newsonafrica` for the browser (including
installed PWA windows), App Router server and API routes, and Edge middleware.
Vercel runs the content-health cron in the same app. The standalone service
worker keeps its existing caching behavior. Supabase hosts the database and
auth. Its deployed `backfill-content-index` function is a retired stub that
returns HTTP 410, so it needs no Sentry project. WordPress is a separate CMS.
This SDK covers failures in the Next.js app, including errors propagated from
its calls to those services.

## Provisioning

1. In [Sentry Projects](https://eljaymedia-5k.sentry.io/settings/projects/),
   reuse the Next.js project with slug `newsonafrica` or create it and assign the
   team that owns the app. Copy the DSN from the project's **Client Keys (DSN)**.
2. In Sentry **Settings → Organization Tokens**, create an organization token
   with `org:ci` for release and artifact uploads.
3. In the Vercel **newsonafrica** project under **Settings → Environment
   Variables**, set `NEXT_PUBLIC_SENTRY_DSN` to the DSN and set
   `SENTRY_AUTH_TOKEN` as Sensitive. Set both for Production and trusted Preview
   deployments. Keep the token out of Development and GitHub Actions. If using
   branch-specific Preview variables, assign both values to the smoke-test branch.
4. Enable Vercel system environment variables in the project. The SDK uses
   Vercel's Git commit SHA for the release and Vercel's environment labels for
   events. Local events fall back to `NODE_ENV`.
5. Build a fresh Preview after setting the variables. The DSN is embedded at
   build time. The SDK uploads source maps during the build and removes uploaded
   browser maps from the deployment output. Check the build log for upload
   success. An unset DSN disables sending, and an unset token skips map upload.

## Controlled Preview check

Use a disposable branch from the integration commit and a protected Vercel
Preview. Add the following two files to that branch and deploy it with the
Preview settings above.

`app/sentry-smoke/page.tsx`

```tsx
"use client";

export default function SentrySmoke() {
  return (
    <button onClick={() => { throw new Error("NewsOnAfrica Sentry browser smoke"); }}>
      Send browser test error
    </button>
  );
}
```

`app/api/sentry-smoke/route.ts`

```ts
export async function POST() {
  throw new Error("NewsOnAfrica Sentry server smoke");
}
```

Open `/sentry-smoke`, click once, then run
`await fetch("/api/sentry-smoke", { method: "POST" })` in that page's developer
console. Expect HTTP 500 for the server probe. In Sentry Issues, filter to
`environment:preview` and find both errors. Open each event and check that the
release matches the Preview commit and the stack points to the original TSX/TS
line. The browser request should reach the DSN host without a CSP violation.
Record both event IDs, resolve the test issues, and remove the disposable branch.
Deploy the integration branch without the smoke-test files.

References: [Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/),
[Sentry scopes](https://docs.sentry.io/api/permissions/).
