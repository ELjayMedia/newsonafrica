# Consent Management

This project integrates an IAB TCF v2 compliant Consent Management Platform (CMP). The CMP script is loaded by `ConsentManager` which wraps the application in `app/layout.tsx`.

## CMP initialization

Set `NEXT_PUBLIC_CMP_SRC` to the CMP JavaScript URL (for example, the SourcePoint or Quantcast snippet). `ConsentManager` injects this script and provides a stub `window.__tcfapi` until the CMP is ready.

## Accessing consent

The CMP exposes consent status through `window.__tcfapi`. Call the helper `waitForTcfConsent()` to wait for a signal that advertising consent has been resolved.

## Testing

1. Configure `NEXT_PUBLIC_CMP_SRC` with your CMP script.
2. Run the app and open the browser console.
3. Execute `__tcfapi('getTCData', 2, console.log)` to inspect the current consent state.
4. Ensure ads appear only after consent is granted.
