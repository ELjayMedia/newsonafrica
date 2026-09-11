# Android Release GitHub Secrets (NOA-171)

This document lists the GitHub Actions secrets required for the Android release
workflow (`.github/workflows/android-release.yml`). All secrets are set at the
repository level: **Settings → Secrets and variables → Actions**.

## Required secrets

| Secret | Type | Description |
|--------|------|-------------|
| `NOA_ANDROID_KEYSTORE` | Base64-encoded string | The release signing keystore file (`.keystore` or `.jks`), base64-encoded. **Never commit the raw keystore.** |
| `NOA_ANDROID_KEYSTORE_PASSWORD` | String | Password for the keystore. |
| `NOA_ANDROID_KEY_ALIAS` | String | Alias of the signing key inside the keystore (e.g. `noa_upload`). |
| `NOA_ANDROID_KEY_PASSWORD` | String | Password for the signing key. For PKCS12 keystores this is usually the same as `NOA_ANDROID_KEYSTORE_PASSWORD`. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON string | Google Play service account credentials (raw JSON). Must have access to `com.newsonafrica.app` in Play Console. |

## Optional secrets

| Secret | Type | Description |
|--------|------|-------------|
| `NOA_ANDROID_KEYSTORE_TYPE` | String | Keystore type (e.g. `pkcs12`). Only set if the default JKS type is not correct. |

## How to generate each secret

### NOA_ANDROID_KEYSTORE

```bash
# Encode the keystore file as base64 (run once, store the output as the secret)
base64 -w 0 /path/to/newsonafrica-upload.keystore
```

The keystore itself must live **outside** the repository. The workflow decodes
this secret to a temporary file at build time and never persists it.

### NOA_ANDROID_KEYSTORE_PASSWORD / NOA_ANDROID_KEY_PASSWORD

These are the passwords you chose when creating the keystore/key with
`keytool`. For PKCS12 keystores Java typically uses the same password for both
— set them to the same value.

### NOA_ANDROID_KEY_ALIAS

The alias you specified when generating the key pair, e.g.:

```bash
keytool -genkey -v \
  -keystore newsonafrica-upload.keystore \
  -alias noa_upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

### GOOGLE_SERVICE_ACCOUNT_KEY

1. In the Google Play Console, go to **Setup → API access**.
2. Create a new service account or use an existing one.
3. Grant the service account **Release manager** (or **Admin**) access to the
   `com.newsonafrica.app` app.
4. Download the JSON key file.
5. Paste the entire JSON content as the secret value.

The `scripts/verify-google-play-access.mjs` script can verify this secret
works before running the full release workflow.

## Workflow triggers

- **Tag push**: Push a tag matching `android-v*` (e.g. `android-v1.0.2`) to
  trigger an automatic release to the **internal** track.
- **Manual dispatch**: Use the **Run workflow** button in GitHub Actions to
  choose a specific track (internal / closed / open / production).

## Security notes

- The keystore secret is base64-encoded so it can be stored as a single-line
  secret. The decoded file only exists on the ephemeral runner during the job.
- The service account key is scoped to Play Console access only. Rotate it
  immediately if it is ever exposed.
- The workflow uses `concurrency` with `cancel-in-progress: false` so a release
  is never interrupted mid-upload.