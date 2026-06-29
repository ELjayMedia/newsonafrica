#!/bin/bash

# Clear Next.js build cache
rm -rf .next
rm -rf dist
rm -rf out

# Clear Node modules cache
rm -rf node_modules/.cache

echo "Build cache cleared successfully"
