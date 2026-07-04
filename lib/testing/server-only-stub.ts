// Test-only stand-in for the `server-only` package.
//
// `server-only` throws when bundled into a client component, using a check
// that assumes the Next.js/webpack build pipeline. Vitest runs modules
// directly under Node, so we alias `server-only` to this no-op (see
// vitest.config.ts) — the real guarantee is still enforced by `next build`.
export {};
