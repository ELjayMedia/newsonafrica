import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import {
  buildInitializePayload,
  buildInvoiceMetadataUpdate,
  buildPaymentFailureUpdate,
  buildSubscriptionCancellationUpdate,
  buildSubscriptionUpsert,
  parseInitializeRequest,
  SUBSCRIPTION_PLANS,
} from "./paystack.ts"

Deno.test("parseInitializeRequest resolves plan by id", () => {
  const request = { planId: "monthly", metadata: { foo: "bar" } }
  const result = parseInitializeRequest(request)
  assertEquals(result.plan.id, "monthly")
  assertEquals(result.metadata, { foo: "bar" })
})

Deno.test("parseInitializeRequest falls back to paystack plan code", () => {
  const plan = SUBSCRIPTION_PLANS[0]
  const result = parseInitializeRequest({ plan_code: plan.paystackPlanId })
  assertEquals(result.plan.id, plan.id)
})

Deno.test("parseInitializeRequest throws on invalid input", () => {
  assertThrows(() => parseInitializeRequest({ planId: "invalid" }))
  assertThrows(() => parseInitializeRequest(null))
})

Deno.test("buildInitializePayload merges metadata", () => {
  const plan = SUBSCRIPTION_PLANS[0]
  const payload = buildInitializePayload("test@example.com", plan, { custom: true })
  assertEquals(payload.email, "test@example.com")
  assertEquals(payload.plan, plan.paystackPlanId)
  assertEquals(payload.metadata.plan_id, plan.id)
  assertEquals(payload.metadata.plan_name, plan.name)
  assertEquals(payload.metadata.paystack_plan_id, plan.paystackPlanId)
  assertEquals(payload.metadata.custom, true)
})

Deno.test("buildSubscriptionUpsert normalizes record", () => {
  const plan = SUBSCRIPTION_PLANS[0]
  const now = new Date("2024-01-01T00:00:00.000Z")
  const record = buildSubscriptionUpsert(
    {
      subscription_code: "SUB_123",
      status: "active",
      createdAt: "2024-01-01T12:00:00Z",
      next_payment_date: "2024-02-01T12:00:00Z",
      plan: { name: plan.name },
    },
    "user-1",
    now,
  )
  assertEquals(record.id, "SUB_123")
  assertEquals(record.user_id, "user-1")
  assertEquals(record.plan, plan.name)
  assertEquals(record.status, "active")
  assertEquals(record.start_date, "2024-01-01T12:00:00.000Z")
  assertEquals(record.renewal_date, "2024-02-01T12:00:00.000Z")
  assertEquals(record.payment_id, "SUB_123")
  assertEquals(record.created_at, now.toISOString())
  assertEquals(record.updated_at, now.toISOString())
})

Deno.test("buildSubscriptionCancellationUpdate sets cancelled fields", () => {
  const now = new Date("2024-01-01T00:00:00.000Z")
  const update = buildSubscriptionCancellationUpdate(now)
  assertEquals(update.status, "cancelled")
  assertEquals(update.end_date, now.toISOString())
  assertEquals(update.renewal_date, null)
  assertEquals(update.updated_at, now.toISOString())
})

Deno.test("buildInvoiceMetadataUpdate preserves metadata", () => {
  const now = new Date("2024-01-01T00:00:00.000Z")
  const metadata = { invoice_code: "INV_1" }
  const update = buildInvoiceMetadataUpdate(metadata, now)
  assertEquals(update.metadata, metadata)
  assertEquals(update.updated_at, now.toISOString())
})

Deno.test("buildPaymentFailureUpdate marks past due", () => {
  const now = new Date("2024-01-01T00:00:00.000Z")
  const data = { invoice_code: "INV_2" }
  const update = buildPaymentFailureUpdate(data, now)
  assertEquals(update.status, "past_due")
  assertEquals(update.metadata, data)
  assertEquals(update.updated_at, now.toISOString())
})
