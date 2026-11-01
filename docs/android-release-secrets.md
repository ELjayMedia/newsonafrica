# Android Release GitHub Secrets (NOA-171/172/173)

This document lists the GitHub Actions secrets required for the Android release
workflow (`.github/workflows/android-release.yml`). All secrets are set at the
repository level: **Settings → Secrets and variables → Actions**.

## Quick Start

1. Generate a keystore (run once):
   ```bash
   bash scripts/setup-android-release-secrets.sh /secure/backup/dir
   ```
2. Copy the printed secrets into GitHub → Settings → Secrets and variables → Actions.
3. Run **Android Release** manually with `publish_to_play` left off to build and
   download a signed AAB without contacting Google Play. Set `version_name` to
   the intended release version; the default is `1.0.3`.
4. Before publishing, set `GOOGLE_SERVICE_ACCOUNT_KEY` with the Play Console
   service account JSON. Run manually with `publish_to_play` enabled and choose
   a track, or push a version tag such as `android-v1.0.3` to publish to internal
   testing. Tag pushes publish automatically.

## Required secrets

| Secret | Type | Description |
|--------|------|-------------|
| `NOA_ANDROID_KEYSTORE` | Base64-encoded string | The release signing keystore file (`.keystore` or `.jks`), base64-encoded. **Never commit the raw keystore.** |
| `NOA_ANDROID_KEYSTORE_PASSWORD` | String | Password for the keystore. |
| `NOA_ANDROID_KEY_ALIAS` | String | Alias of the signing key inside the keystore (e.g. `noa_upload`). |
| `NOA_ANDROID_KEY_PASSWORD` | String | Password for the signing key. For PKCS12 keystores this is usually the same as `NOA_ANDROID_KEYSTORE_PASSWORD`. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | JSON string | Required when publishing to Google Play. Raw service account JSON with access to `com.newsonafrica.app` in Play Console; not needed for a build-only run. |

Both build-only and publishing runs need the four signing secrets. Debug builds
in CI do not use signing secrets. GitHub stores secret values privately; their
presence alone does not prove the keystore, passwords, or Play permissions work.
A successful signed build and publishing preflight provide that evidence.

## Optional secrets

| Secret | Type | Description |
|--------|------|-------------|
| `NOA_ANDROID_KEYSTORE_TYPE` | String | Keystore type (e.g. `pkcs12`). Only set if the default JKS type is not correct. |

## How to generate each secret

### NOA_ANDROID_KEYSTORE

The `scripts/setup-android-release-secrets.sh` script automates keystore
generation and prints the GitHub secrets to set. Run it once on a machine
with Java 17+:

```bash
bash scripts/setup-android-release-secrets.sh /secure/backup/dir
```

It generates a PKCS12 keystore, prints the base64-encoded value for
`NOA_ANDROID_KEYSTORE`, and reminds you to back up the keystore and
passwords.

To encode an existing keystore:

```bash
# Linux
base64 -w 0 /path/to/newsonafrica-upload.keystore
# macOS
base64 -i /path/to/newsonafrica-upload.keystore | tr -d '\n'
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
works before running the full release workflow:

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY='<paste JSON here>'
node scripts/verify-google-play-access.mjs
```

## whatsnew directory

The workflow reads release notes from `android/whatsnew/`. Create this
directory with the uploader's required `whatsnew-<LOCALE>` filenames:

```
android/whatsnew/
  whatsnew-en-US    # English release notes
  whatsnew-af-ZA    # Afrikaans (optional)
```

Each file should contain plain text (max 500 chars) describing the release.
A bare filename such as `en-US` is ignored by the upload action. Update the
notes for each release before publishing.

## Workflow triggers

- **Tag push**: Push a version tag such as `android-v1.0.3` to build that
  version and automatically publish to the **internal** track.
- **Manual dispatch**: Use the **Run workflow** button in GitHub Actions. Set
  `version_name`, optionally override `version_code`, and leave `publish_to_play`
  off for a build-only run. Enable it to publish to the selected track:
  `internal`, `alpha` (closed testing), `beta` (open testing), or `production`.
  The values are Play API track IDs, not the Console's display labels. Confirm
  that the chosen testing track exists in the app's Play Console.

The default CI version code starts at the workflow run number plus 3, so the
first build-only run uses code 4. For publishing runs without a manual
`version_code` override, the preflight raises this code to the highest existing
Play bundle code plus 1 when needed. This also keeps tag releases working after
a manual run used a higher code. Both the final version code and version name
are passed to Gradle.

Manual `version_code` overrides must be integers from 1 through 2100000000 and
must be greater than every existing Play bundle code; the preflight rejects an
explicit code that is already used or too low. Re-running a published run with
an explicit override requires choosing a fresh code in a new manual run.

Before publishing, the workflow verifies Play API access and version-code
availability **before** decoding the signing key or building. The preflight
creates an edit, reads APK and bundle metadata, and deletes the edit; it does not
publish anything. A build-only run skips this check and the upload step.
Publishing builds upload an AAB and release notes. Store listing text and
optional graphics use the separate listing workflow documented in
[`play-store-listing.md`](play-store-listing.md).

## Local testing

To test the release build locally without GitHub Actions:

```bash
# Copy and fill in the template
cp scripts/android-release-env.example /tmp/noa-android-release-env
# Edit /tmp/noa-android-release-env with real values
source /tmp/noa-android-release-env
# Use a fresh code above every code already uploaded to this Play app.
export NOA_ANDROID_VERSION_CODE=4
export NOA_ANDROID_VERSION_NAME=1.0.3

cd android
./gradlew clean bundleRelease
```

Verify the output:

```bash
# Check AAB exists
ls -la app/build/outputs/bundle/release/app-release.aab

# Verify signature
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab

# Print SHA-256 fingerprint
keytool -list -v \
  -keystore "$NOA_ANDROID_KEYSTORE" \
  -alias "$NOA_ANDROID_KEY_ALIAS" \
  -storepass "$NOA_ANDROID_KEYSTORE_PASSWORD" | grep SHA256
```

## Security notes

- The keystore secret is base64-encoded so it can be stored as a single-line
  secret. The decoded file only exists on the ephemeral runner during the job.
- The service account key is scoped to Play Console access only. Rotate it
  immediately if it is ever exposed.
- The workflow uses `concurrency` with `cancel-in-progress: false` so a release
  is never interrupted mid-upload.
- Back up the keystore file and passwords in a password manager. Without them
  you cannot sign future releases.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Keystore was tampered with, or password was incorrect` | Wrong `NOA_ANDROID_KEYSTORE_PASSWORD` or `NOA_ANDROID_KEY_PASSWORD`. |
| `Cannot recover key` | Wrong `NOA_ANDROID_KEY_PASSWORD` (for PKCS12, this must equal the store password). |
| `No key with alias 'noa_upload'` | Wrong `NOA_ANDROID_KEY_ALIAS`. |
| `AAB not found` | Build failed before AAB generation — check build logs. |
| `Google Play API access check failed` | Service account JSON is invalid or lacks permissions. |
| Missing release notes | Create `android/whatsnew/whatsnew-en-US` with release notes. |
| Version code already used or too low | Start a new manual run with `version_code` greater than the highest code in Play Console. |
