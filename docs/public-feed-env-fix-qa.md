# QA checklist: public WordPress feed

After deploying this branch:

1. Open `/sz` and confirm real articles render instead of `No stories available yet`.
2. Open `/za` and confirm the same behavior for South Africa if the WordPress edition has posts.
3. Open `/` and confirm the pan-African home can aggregate available country feeds.
4. Check Vercel runtime logs for `Country feed unavailable on pan-African home`.
5. Confirm missing or short admin-only sync/webhook secrets no longer block public WordPress feed rendering.

Expected result: public feeds depend on WordPress read config, not admin-only content-sync/webhook credentials.
