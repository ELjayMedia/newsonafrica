#!/bin/bash

echo "Building News On Africa TWA..."

# Validate the TWA manifest
echo "Validating TWA configuration..."
bubblewrap validate --manifest=./twa-manifest.json

# Build the Android project
echo "Building Android project..."
bubblewrap build

# Generate signed AAB for Play Store
echo "Generating signed AAB..."
cd app
./gradlew bundleRelease

echo "Build complete!"
echo "Your signed AAB is located at: app/build/outputs/bundle/release/app-release.aab"
echo "This file is ready for upload to Google Play Console."
