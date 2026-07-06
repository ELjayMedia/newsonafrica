# Supabase Auth password protection runbook

Related Jira issue: NOA-11

This runbook documents the News On Africa Supabase Auth password hardening settings and verification steps for leaked password protection.

## Project

- Supabase project: News On Africa
- Project ref: `anhjovxdgwepobsgudya`
- Jira: `NOA-11 — Enable Supabase leaked password protection`

## Auth mode confirmed from the app

The current app uses mixed Supabase Auth:

- Email + password sign-up via `supabase.auth.signUp` in `lib/auth/actions.ts`.
- Email + password sign-in via `supabase.auth.signInWithPassword` in `lib/auth/actions.ts`.
- Password reset / password update via `resetPasswordForEmail` and `updateUser` in `lib/auth/actions.ts`.
- Google OAuth hand-off via `signInWithOAuth({ provider: "google" })` in `lib/auth/actions.ts`.

Leaked password protection is therefore relevant because the product supports password-based account creation and password changes.

## Dashboard change required

The current connector can read Supabase security advisors, but it does not expose the Auth settings mutation needed to toggle leaked password protection. Enable it manually in Supabase Dashboard:

1. Open Supabase Dashboard.
2. Select the **News On Africa** project.
3. Go to **Authentication → Providers → Email** or **Authentication → Sign In / Providers**, depending on the dashboard layout.
4. Find the password security section.
5. Enable **Prevent use of leaked passwords** / **Leaked password protection**.
6. Save the provider/auth settings.
7. Re-run Supabase **Security Advisors** for the project.

Supabase documentation notes that leaked password protection uses the HaveIBeenPwned Pwned Passwords API and is available on Pro Plan and above.

## Verification checklist

After enabling the dashboard setting:

- [ ] Re-run the Supabase security advisor and confirm `auth_leaked_password_protection` is cleared.
- [ ] Confirm existing login still works with a valid non-compromised password.
- [ ] Confirm registration rejects a known compromised password with app copy:
  - `That password is too weak or has appeared in a known data breach. Choose a longer, unique password that you don’t use elsewhere.`
- [ ] Confirm password reset rejects a known compromised password with the same app copy.
- [ ] Confirm a valid strong password can still be used for sign-up and password reset.
- [ ] Confirm Google sign-in is unaffected.

## Current implementation note

`lib/auth/actions.ts` now centralizes Supabase password-policy error handling for sign-up, sign-in and password reset. This avoids exposing raw Supabase error messages while still giving users a clear instruction when a password is weak, leaked, breached, compromised, or rejected under Supabase password policy.

For sign-in, the app uses safer copy:

`This password can’t be used anymore. Reset your password with a stronger, unique password.`

For sign-up and password reset, the app uses:

`That password is too weak or has appeared in a known data breach. Choose a longer, unique password that you don’t use elsewhere.`
