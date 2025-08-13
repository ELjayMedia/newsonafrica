# Engineering Standards

This project uses modern tooling and conventions to keep development consistent.

## Runtime Requirements

- **Node.js**: >=22 <23
- **pnpm**: >=9 <10 (repository uses pnpm 9.12.0)

## Common Scripts

| Command | Description |
| --- | --- |
| `pnpm typecheck` | Run TypeScript compiler in check mode. |
| `pnpm lint` | Lint the codebase with ESLint. |
| `pnpm format` | Format code using Prettier. |
| `pnpm lhci` | Run Lighthouse CI performance checks. |

These commands are also available via the [Makefile](../Makefile) (e.g. `make lint`).

## Commit Messages

Commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification and are checked with Commitlint.

## Environment Variables

Create a `.env.local` file for local development. See [README.md](../README.md#environment-variables) for a list of required values.

## Running Locally

1. Install dependencies: `pnpm install`
2. Start the dev server: `pnpm dev`
   - Alternatively, use `make dev` with the provided Makefile.

