#!/bin/bash
set -e

# Build the Next.js project and export static assets
npm run build
npx next export -o dist

# Sync Capacitor configuration and copy web assets to native projects
npx cap sync
