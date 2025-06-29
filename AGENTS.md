# Automation Instructions

This repository uses Node.js with pnpm and Capacitor. To build the web assets and copy them into the native project, run the export script.

## Setup
- Install dependencies with `pnpm install --frozen-lockfile`.
- Lint the code with `pnpm run lint`.

## Build for Capacitor
- Run `./export-capacitor.sh` to build the Next.js project and copy the output to Capacitor's `webDir` (`out`).
- After exporting you can run `npx cap sync` to update native platforms.

## Appflow
- Cloud builds are triggered via `.github/workflows/appflow.yml` when pushing to `main`.
- Set `APPFLOW_TOKEN` and `APPFLOW_APP_ID` secrets in GitHub to enable.

