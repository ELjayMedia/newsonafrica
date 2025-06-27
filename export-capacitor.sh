#!/bin/bash

# Export the Next.js app and copy it into Capacitor's webDir

set -e

echo "\xF0\x9F\x93\xA6 Building and exporting Next.js site..."
npm run build && npm run export

echo "\xF0\x9F\x9A\xA9 Copying files to Capacitor..."
npx cap copy

echo "\xE2\x9C\x85 Done."
