#!/bin/bash

echo "Generating Android keystore for TWA signing..."

# Generate keystore
keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=News On Africa, OU=Mobile, O=News On Africa, L=City, ST=State, C=US" \
  -storepass android -keypass android

echo "Keystore generated successfully!"
echo "File: android.keystore"
echo "Alias: android"
echo "Store Password: android"
echo "Key Password: android"
echo ""
echo "IMPORTANT: Keep this keystore file secure and backed up!"
echo "You'll need it for all future app updates."
