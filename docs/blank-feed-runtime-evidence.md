# Blank feed runtime evidence

Observed on production after PR #1484 landed:

- `https://app.newsonafrica.com/sz` returned HTTP 200.
- The rendered page showed `No stories available yet`.
- Vercel logs showed `Country feed unavailable on pan-African home`.
- The logged exception was global server env validation, specifically admin-only values being required while loading public WordPress feeds.

Conclusion:

PR #1484 landed and removed the article-body sanitizer crash, but the front page still had a separate failure: public WordPress feed reads were blocked by global validation of unrelated admin-only secrets.
