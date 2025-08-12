# Deployment

## Tooling Versions
- Node: 18.x (see `.nvmrc`)
- pnpm: 9.12.0 (via `packageManager` field)

## Vercel
\`\`\`
node -v
pnpm -v
pnpm install --frozen-lockfile
pnpm build
\`\`\`

## Appflow
1. `pnpm install --frozen-lockfile`
2. `pnpm build:web`
3. Copy the `out` directory to Capacitor's `webDir`
4. Run Capacitor sync/build commands

## Bumping Dependencies
\`\`\`
pnpm up <pkg>@<version> --latest && pnpm install --frozen-lockfile
\`\`\`
