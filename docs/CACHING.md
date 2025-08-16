# Caching

- `menu:{country}` – WordPress categories, cached for 30 minutes.
- `frontpage:{country}` – Featured posts, cached for 5 minutes.

Caches use in-memory storage in development and Upstash Redis in production when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are provided.
