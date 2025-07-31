#!/bin/bash
set -e

if [ ! -d node_modules ]; then
  echo "node_modules directory not found. Please run 'npm install' before building." >&2
  exit 1
fi

npx next build
npx next export -o out

