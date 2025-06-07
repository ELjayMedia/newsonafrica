#!/bin/bash

set -e

echo "Building News On Africa TWA..."

# Validate the TWA manifest
echo "Validating TWA configuration..."
bubblewrap validate --manifest=./twa-manifest.json

# Build the Android project
echo "Building Android project..."
bubblewrap build


# Generate signed AAB and APK for Play Store
echo "Generating signed AAB and APK..."
cd app
./gradlew bundleRelease assembleRelease

# go back to repo root
cd ..

echo "Build complete!"
echo "Signed APK: app/build/outputs/apk/release/app-release.apk"
echo "Signed AAB: app/build/outputs/bundle/release/app-release.aab"
echo "Upload the AAB file to Google Play Console."
