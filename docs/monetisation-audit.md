# Subscriptions & payment webhook audit + decision (NOA-25, NOA-26)

Current state of the subscription/payment path in the rebuild, the security
risks in it today, and the decision on where payment-webhook logic should live.

> **Why this supersedes the June comments.** Earlier NOA-25/26 notes (20 Jun)
> described a fully-implemented Supabase Edge Function flow (`create-paystack-session`,
> `paystack-webhook`, a `webhook_events` idempotency table, `user_has_active_subscription`
> helpers) as if live. **Verified against production (`anhjovxdgwepobsgudya`) and the
> tree on 2026-07-11, that flow is _not_ deployed** — it exists only under `legacy/`.
> The accurate current state is below.

## 1. Current state (audit — NOA-25)

### What exists

| Piece | State |
| ----- | ----- |
| `public.subscriptions` table | **Exists**, RLS enabled, **0 rows** (pre-launch) |
| Columns | `id uuid`, `user_id uuid`, `plan text`, `status text`, `start_date`, `end_date`, `renewal_date`, `payment_provider text`, `payment_id text`, `metadata jsonb`, `created_at`, `updated_at` |
| Env scaffolding | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` declared (both **optional**) in `lib/env.ts` |
| Legacy reference impl | `legacy/supabase/functions/{create-paystack-session,paystack-webhook}`, `legacy/components/{PaystackButton,SubscribeContent}.tsx`, `legacy/config/paystack.ts` |

### What does NOT exist (contrary to the June notes)

- **No deployed payment edge functions** — the only deployed function is
  `backfill-content-index`. `create-paystack-session` / `paystack-webhook` are
  **not** deployed.
- **No `webhook_events` table** → the idempotency mechanism the June note relied
  on is absent.
- **No `user_has_active_subscription` / `get_active_subscription` helpers.**
- **No payment/subscription code in the active app tree** — only `lib/env.ts`
  references Paystack. No subscription route, UI, data layer, or server action;
  `/account` has only bookmarks, onboarding, profile.
- The `id` column is a `uuid` (not the Paystack `subscription_code` the June note
  assumed), and the provider column is `payment_provider` (not `provider`).

Net: **there is no active monetisation journey.** The schema is a scaffold; the
implementation lives only in `legacy/` and would need porting.

### Security finding — unsafe direct-client write (real)

`subscriptions` RLS has an **INSERT policy for the `authenticated` role** whose
only check is `auth.uid() = user_id`:

| Policy | Cmd | Role | Check |
| ------ | --- | ---- | ----- |
| `subscriptions_insert` | INSERT | authenticated | `auth.uid() = user_id` |
| `subscriptions_select` | SELECT | authenticated | `auth.uid() = user_id` |

This means **any signed-in user can insert their own subscription row directly
from the client** (e.g. `{user_id: self, plan: 'premium', status: 'active'}`)
using the anon/authenticated key — self-granting a plan without paying. The June
audit's claim that "direct client writes are not possible" is **incorrect** for
the current schema.

It is **not exploitable today** (nothing reads `subscriptions` — no entitlement
gate exists, 0 rows), but it **must be fixed before any feature gates on
subscription status.** Payments must be written only by a trusted server/webhook
using the service role. → follow-up **NOA-143**.

## 2. Decision — where payment-webhook logic lives (NOA-26)

**Decision: Supabase Edge Function** for both the checkout-session initializer and
the payment webhook. (This re-affirms the intended design — but note it is a
*decision to (re)implement*, not something already deployed.)

### Rationale

| Consideration | Supabase Edge Function ✅ | Next.js API route (Vercel) |
| ------------- | ------------------------ | -------------------------- |
| Service-role DB write | `SUPABASE_SERVICE_ROLE_KEY` auto-injected; no extra secret in Vercel | Must add service-role secret to Vercel + build a client |
| DB proximity | Same project — no cross-network hop | HTTPS hop Vercel → Supabase |
| Secret blast radius | Payment secrets stay in Supabase, off the web app | Payment secrets added to the Next.js runtime |
| Precedent | The content-sync path already uses an edge function for the same "server reach + service role" reason | The WordPress webhook uses a Next.js route, but it needs `revalidateTag`, which is Next-only |

The WordPress webhook stays a Next.js route because it calls `revalidateTag`
(Next-only). The payment webhook has the opposite shape — it only needs a
verified write to Postgres with the service role — so the edge function is the
better home and keeps payment secrets out of the web app.

### Requirements the implementation must meet

- **Signature verification** — Paystack HMAC-SHA-512 of the raw body against
  `PAYSTACK_WEBHOOK_SECRET`, constant-time compare.
- **Idempotency** — create the missing `webhook_events` table
  (`source text, payload_hash text unique, created_at timestamptz`); a SHA-256 of
  the raw body dedupes retries (return 200 on duplicate).
- **Service-role write only** — the webhook writes `subscriptions` with the
  service role; **no client/`authenticated` write path** (see NOA-143).
- **JWT-gated checkout** — `create-paystack-session` requires a valid Supabase JWT
  and sets `user_id` server-side from the token, never from client input.
- **Events** — handle `subscription.create` / `subscription.disable` /
  `invoice.update` / `invoice.payment_failed`.

### Secrets required (Supabase Edge Function secrets)

`PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` (set in Supabase, not Vercel);
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are auto-injected.
Register the webhook in Paystack as
`https://anhjovxdgwepobsgudya.supabase.co/functions/v1/paystack-webhook`.

## 3. Gaps → follow-up tickets

| Gap | Ticket |
| --- | ------ |
| `subscriptions_insert` RLS lets clients self-grant plans | **NOA-143** (security fix — do before any entitlement gate) |
| Payment flow not implemented in the rebuild (port legacy edge functions, add `webhook_events` + helper functions, deploy, wire env/webhook) | **NOA-144** |
| No subscriber UI (subscribe + manage/cancel) | **NOA-145** |

Also note whether monetisation is even in the launch scope — if v1 is
ad-supported (see NOA-27 commercial content), subscriptions can be deferred; if
so, the RLS fix (NOA-143) should still land so the scaffold isn't a latent risk.

## Recommendation for the NOA-5 epic

1. Confirm whether paid subscriptions are in the launch scope or deferred behind
   the ad/commercial model (NOA-27).
2. Regardless of timing, **land NOA-143** (RLS fix) so `subscriptions` can't be
   self-written.
3. If monetisation is in scope: implement the Supabase Edge Function flow
   (NOA-144) per §2, then build the subscriber UI (NOA-145).
