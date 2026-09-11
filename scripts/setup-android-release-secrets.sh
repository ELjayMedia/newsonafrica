#!/usr/bin/env bash
#
# scripts/setup-android-release-secrets.sh
#
# Generates a NOA Android release-signing keystore and prints the GitHub
# secrets to set. Run this once on a machine with Java 17+ (for keytool).
#
# Usage:
#   bash scripts/setup-android-release-secrets.sh [output-dir]
#
# The generated keystore is written to <output-dir>/newsonafrica-upload.keystore.
# If output-dir is omitted, the keystore is written to the system temp dir.
#
# IMPORTANT:
#   - The keystore is a release signing key. Back it up securely.
#   - Never commit the raw keystore to Git (.gitignore already blocks *.keystore).
#   - Print the secrets and paste them into GitHub:
#       Settings → Secrets and variables → Actions → New repository secret
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
APP_ID="com.newsonafrica.app"
KEYSTORE_BASENAME="newsonafrica-upload.keystore"
KEY_ALIAS="${NOA_ANDROID_KEY_ALIAS:-noa_upload}"
KEY_SIZE=2048
VALIDITY_DAYS=10000  # ~27 years

# ---------------------------------------------------------------------------
# Resolve output directory
# ---------------------------------------------------------------------------
OUTPUT_DIR="${1:-$(mktemp -d -t noa-keystore.XXXXXX)}"
mkdir -p "$OUTPUT_DIR"

KEYSTORE_PATH="$OUTPUT_DIR/$KEYSTORE_BASENAME"

if [[ -e "$KEYSTORE_PATH" ]]; then
  echo "ERROR: $KEYSTORE_PATH already exists. Move or delete it first." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Check for keytool
# ---------------------------------------------------------------------------
if ! command -v keytool &>/dev/null; then
  echo "ERROR: keytool not found on PATH." >&2
  echo "" >&2
  echo "Install a JDK (17+ recommended):" >&2
  echo "  macOS:  brew install openjdk@17" >&2
  echo "  Ubuntu: sudo apt install openjdk-17-jdk" >&2
  echo "  Or use Android Studio's embedded JDK:" >&2
  echo "    export PATH=\"\$HOME/Android/Servlet/jbr/bin:\$PATH\"" >&2
  echo "" >&2
  echo "This script cannot generate a keystore without keytool." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Prompt for passwords (interactive; falls back to generated for CI)
# ---------------------------------------------------------------------------
if [[ -t 0 ]]; then
  echo ""
  echo "=== NOA Android Release Keystore Generator ==="
  echo ""
  echo "App ID:         $APP_ID"
  echo "Key alias:      $KEY_ALIAS"
  echo "Key size:       $KEY_SIZE bits"
  echo "Validity:       $VALIDITY_DAYS days"
  echo "Output:         $KEYSTORE_PATH"
  echo ""

  read -rsp "Keystore password: " KEYSTORE_PASSWORD
  echo ""
  read -rsp "Key password (press Enter to reuse keystore password): " KEY_PASSWORD
  echo ""
  if [[ -z "$KEY_PASSWORD" ]]; then
    KEY_PASSWORD="$KEYSTORE_PASSWORD"
    echo "(Using keystore password for the key as well.)"
  fi
else
  # Non-interactive: generate strong random passwords.
  echo "Non-interactive mode — generating random passwords." >&2
  KEYSTORE_PASSWORD="$(openssl rand -base64 32)"
  KEY_PASSWORD="$KEYSTORE_PASSWORD"
fi

# ---------------------------------------------------------------------------
# Prompt for distinguished-name fields (with sensible defaults)
# ---------------------------------------------------------------------------
if [[ -t 0 ]]; then
  read -rp "  Organisation (O) [News on Africa]: " DN_O
  read -rp "  Organisational Unit (OU) [Engineering]: " DN_OU
  read -rp "  Locality (L) [Cape Town]: " DN_L
  read -rp "  State/Province (ST) [Western Cape]: " DN_ST
  read -rp "  Country (C) [ZA]: " DN_C
fi
DN_O="${DN_O:-News on Africa}"
DN_OU="${DN_OU:-Engineering}"
DN_L="${DN_L:-Cape Town}"
DN_ST="${DN_ST:-Western Cape}"
DN_C="${DN_C:-ZA}"

DN="CN=$DN_O, OU=$DN_OU, O=$DN_O, L=$DN_L, ST=$DN_ST, C=$DN_C"

# ---------------------------------------------------------------------------
# Generate the keystore
# ---------------------------------------------------------------------------
echo ""
echo "Generating keystore..."
keytool -genkey -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA -keysize "$KEY_SIZE" -validity "$VALIDITY_DAYS" \
  -storetype PKCS12 \
  -dname "$DN" \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD"

echo "Keystore written to $KEYSTORE_PATH"

# ---------------------------------------------------------------------------
# Compute GitHub secret values
# ---------------------------------------------------------------------------
KEYSTORE_B64="$(base64 -w 0 "$KEYSTORE_PATH" 2>/dev/null || base64 "$KEYSTORE_PATH")"

# Read the SHA-256 fingerprint for assetlinks.json reference
SHA256_FINGERPRINT="$(keytool -list -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -storepass "$KEYSTORE_PASSWORD" \
  2>/dev/null | awk -F': ' '/SHA256:/{print $2}')"

# ---------------------------------------------------------------------------
# Output secrets
# ---------------------------------------------------------------------------
cat <<EOF

================================================================================
  GITHUB SECRETS — paste these into:
  https://github.com/<org>/<repo>/settings/secrets/actions
================================================================================

Secret name                       | Value
----------------------------------|----------------------------------------------
NOA_ANDROID_KEYSTORE              | $KEYSTORE_B64
NOA_ANDROID_KEYSTORE_PASSWORD     | $KEYSTORE_PASSWORD
NOA_ANDROID_KEY_ALIAS             | $KEY_ALIAS
NOA_ANDROID_KEY_PASSWORD          | $KEY_PASSWORD
NOA_ANDROID_KEYSTORE_TYPE         | pkcs12

================================================================================
  OPTIONAL / LATER
================================================================================

Google Play service account key (paste the full JSON):
  GOOGLE_SERVICE_ACCOUNT_KEY      | <paste service account JSON here>

Upload certificate SHA-256 fingerprint:
  $SHA256_FINGERPRINT

This is the UPLOAD key fingerprint. If you enable Google Play App Signing,
the app-signing certificate will be different — use the one shown in
Play Console → Setup → App integrity for public/.well-known/assetlinks.json.

================================================================================
  BACKUP
================================================================================

Back up $KEYSTORE_PATH, the keystore password, and the key password in your
password manager. Without them you cannot sign future releases.

To verify the keystore later:
  keytool -list -v -keystore $KEYSTORE_PATH -alias $KEY_ALIAS -storepass <pw>

================================================================================
EOF

# ---------------------------------------------------------------------------
# Reminder
# ---------------------------------------------------------------------------
echo ""
echo "Next steps:"
echo "  1. Set the GitHub secrets above."
echo "  2. Keep $KEYSTORE_PATH outside the repo."
echo "  3. Commit the updated docs: docs/android-release-secrets.md"
echo ""
echo "Done."