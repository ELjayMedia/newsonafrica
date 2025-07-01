#!/bin/bash

echo "Validating News On Africa TWA setup..."

# Check if required files exist
if [ ! -f "twa-manifest.json" ]; then
    echo "❌ twa-manifest.json not found"
    exit 1
fi

if [ ! -f "android.keystore" ]; then
    echo "⚠️  android.keystore not found. Run generate-keystore.sh first."
fi

# Validate the manifest
echo "Validating TWA manifest..."
bubblewrap validate --manifest=./twa-manifest.json

if [ $? -eq 0 ]; then
    echo "✅ TWA manifest is valid"
else
    echo "❌ TWA manifest validation failed"
    exit 1
fi

# Check if PWA is accessible
echo "Checking PWA accessibility..."
curl -s -o /dev/null -w "%{http_code}" https://app.newsonafrica.com/ | grep -q "200"

if [ $? -eq 0 ]; then
    echo "✅ PWA is accessible"
else
    echo "⚠️  PWA might not be accessible"
fi

echo "✅ Validation complete!"
