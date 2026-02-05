#!/bin/bash
# Regenerate pnpm lockfile to sync with pinned versions in package.json

set -e

echo "Removing old lockfile..."
rm -f pnpm-lock.yaml

echo "Installing dependencies and generating new lockfile..."
pnpm install

echo "Lockfile regenerated successfully!"
