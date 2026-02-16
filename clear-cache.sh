#!/bin/bash

# Clear Next.js build cache
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

# Clear any build artifacts
find . -name "*.tsbuildinfo" -delete
find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

echo "Build cache cleared successfully"
