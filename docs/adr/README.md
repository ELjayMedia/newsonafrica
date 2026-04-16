# Architecture Decision Records

This directory contains [Architecture Decision Records](https://adr.github.io/)
for News on Africa. Each ADR captures a decision we've already made, the
forces that drove it, and the consequences we accept.

## Conventions

- Files are named `NNNN-short-title.md` with a zero-padded sequential number.
- Status is one of: `Proposed`, `Accepted`, `Deprecated`, `Superseded by NNNN`.
- Once a decision is **Accepted** the file is immutable except for status
  updates. To change a decision, write a new ADR that supersedes the
  previous one.
- Keep each ADR short (one screen). The goal is to record *why*, not
  document the current state of the code.

## Template

```md
# NNNN. Title

- Status: Proposed | Accepted | Deprecated | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

What problem are we solving? What are the forces at play?

## Decision

What did we decide?

## Consequences

What becomes easier? What becomes harder? What did we trade away?

## Alternatives considered

Briefly list the options we rejected and why.
```

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-nextjs-app-router.md) | Use Next.js App Router with React Server Components | Accepted |
| [0002](./0002-wordpress-graphql-source.md) | WordPress is the canonical content source via WPGraphQL | Accepted |
| [0003](./0003-wordpress-service-boundary.md) | App-layer WP reads must go through `lib/wordpress/service` | Accepted |
| [0004](./0004-supabase-auth-and-user-data.md) | Supabase owns auth and user-generated data | Accepted |
| [0005](./0005-per-country-editions.md) | Per-country editions via URL prefix and dedicated WP endpoints | Accepted |
| [0006](./0006-structured-logging-safe-action.md) | All server actions go through `safeAction` with structured logging | Accepted |
