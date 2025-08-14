# Security and Privacy

This project enforces a strict Content Security Policy with per-request nonces and hardened HTTP headers via middleware. Write endpoints are protected with Upstash rate limits, and all inputs are validated using Zod schemas.

Remote images are fetched through an allow-listed proxy to prevent browser leaks, and user media uploads reside in a private Supabase bucket secured by RLS. Environment variables are checked at runtime and CI runs dependency audits and secret scans.

Audit events capture minimal metadata for sensitive actions such as sign-in, comments, bookmarks, and avatar uploads.
