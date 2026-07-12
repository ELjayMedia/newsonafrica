# Play Console API access check

Use this check to confirm that a Google service account can access the News on
Africa Play Console app before attempting automated upload or release
publishing.

The check creates a temporary Google Play edit for `com.newsonafrica.app`, reads
bundle metadata, and deletes the temporary edit. It does not upload a build or
submit a release.

## Requirements

- Google Play Developer API enabled for the linked Google Cloud project.
- Service account granted access in Play Console -> Setup -> API access.
- Service account JSON available as `GOOGLE_SERVICE_ACCOUNT_KEY`. Raw JSON,
  JSON with escaped newlines, and base64-encoded JSON are supported.

## Run

```sh
export GOOGLE_SERVICE_ACCOUNT_KEY="$(cat /secure/path/service-account.json)"
pnpm play:verify-access
```

To check a different package name:

```sh
PLAY_PACKAGE_NAME=com.newsonafrica.app pnpm play:verify-access
```

Successful output ends with:

```text
Google Play API access verified.
```

If Play App Signing creates a different app-signing certificate after the AAB is
uploaded, add that SHA-256 to `public/.well-known/assetlinks.json`, deploy, and
re-run Digital Asset Links verification before treating the Play-installed TWA
as final.
