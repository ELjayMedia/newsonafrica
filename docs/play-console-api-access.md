# Play Console API access check

Use this check to confirm that a Google service account can access the News on
Africa Play Console app before attempting automated upload or release
publishing.

The check creates a temporary Google Play edit for `com.newsonafrica.app`, reads
APK and bundle metadata, and deletes the temporary edit. When
`NOA_ANDROID_VERSION_CODE` is set, it also rejects a code that is not greater
than the existing APK and bundle version codes. In the workflow's automatic-code mode
(`PLAY_AUTO_VERSION_CODE=true`), it instead raises the candidate code to the
highest existing APK or bundle code plus 1 when necessary, and emits the selected
code as the `version-code` GitHub Actions output. It does not upload a build, commit an
edit, submit a release, or validate store listing completeness.

Android Release runs this check before signing/building whenever publishing is
requested. Build-only dispatches and the debug-build CI job skip Google Play
access entirely.

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

To check a proposed upload code as well:

```sh
NOA_ANDROID_VERSION_CODE=4 pnpm play:verify-access
```

Choose a code greater than every code already uploaded in Play Console. Passing
this check establishes API access and a usable bundle code at the time of the
check; it does not prove all release permissions or Play review requirements.
The subsequent upload is the check for those release operations.

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

