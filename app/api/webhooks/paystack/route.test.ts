/* @vitest-environment node */
import { describe, it, expect, vi, beforeAll } from "vitest"
let handlers: any

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "testkey"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
  handlers = await import("./route")
})

// Helpers to create mock supabase client
function createClient(tables: Record<string, any>) {
  return {
    from: (table: string) => tables[table],
  } as any
}

describe("Paystack webhook handlers", () => {
  const userResult = { data: { id: "user1" }, error: null }

  const chargeData = {
    reference: "ref1",
    amount: 5000,
    status: "success",
    customer: { email: "user@example.com" },
  }

  it("handleChargeSuccess persists transaction", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      transactions: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleChargeSuccess(chargeData as any, client)
    expect(client.from("transactions").insert).toHaveBeenCalled()
    expect(client.from("notifications").insert).toHaveBeenCalled()
  })

  it("handleChargeSuccess throws on insert error", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      transactions: {
        insert: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await expect(handlers.handleChargeSuccess(chargeData as any, client)).rejects.toThrow()
  })

  const subCreateData = {
    subscription_code: "sub1",
    customer: { email: "user@example.com" },
    plan: { name: "basic" },
    status: "active",
    createdAt: new Date().toISOString(),
    next_payment_date: new Date().toISOString(),
  }

  it("handleSubscriptionCreated inserts subscription", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      subscriptions: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleSubscriptionCreated(subCreateData as any, client)
    expect(client.from("subscriptions").insert).toHaveBeenCalled()
  })

  it("handleSubscriptionCreated throws on insert error", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      subscriptions: {
        insert: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await expect(handlers.handleSubscriptionCreated(subCreateData as any, client)).rejects.toThrow()
  })

  const subDisableData = {
    subscription_code: "sub1",
  }

  it("handleSubscriptionDisabled updates subscription", async () => {
    const client = createClient({
      subscriptions: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { user_id: "user1" }, error: null }) }) }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleSubscriptionDisabled(subDisableData as any, client)
    expect(client.from("subscriptions").update).toHaveBeenCalled()
  })

  it("handleSubscriptionDisabled throws when not found", async () => {
    const client = createClient({
      subscriptions: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error("no") }) }) }),
      },
    })
    await expect(handlers.handleSubscriptionDisabled(subDisableData as any, client)).rejects.toThrow()
  })

  const paymentFailedData = {
    reference: "ref1",
    customer: { email: "user@example.com" },
  }

  it("handlePaymentFailed updates transaction", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      transactions: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handlePaymentFailed(paymentFailedData as any, client)
    expect(client.from("transactions").update).toHaveBeenCalled()
  })

  it("handlePaymentFailed throws on update error", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      transactions: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
    })
    await expect(handlers.handlePaymentFailed(paymentFailedData as any, client)).rejects.toThrow()
  })

  const invoiceData = {
    invoice_code: "inv1",
    customer: { email: "user@example.com" },
    status: "pending",
  }

  it("handleInvoiceUpdate updates subscription", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      subscriptions: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
      notifications: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleInvoiceUpdate(invoiceData as any, client)
    expect(client.from("subscriptions").update).toHaveBeenCalled()
  })

  it("handleInvoiceUpdate throws on update error", async () => {
    const client = createClient({
      profiles: {
        select: () => ({ eq: () => ({ single: () => Promise.resolve(userResult) }) }),
      },
      subscriptions: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
    })
    await expect(handlers.handleInvoiceUpdate(invoiceData as any, client)).rejects.toThrow()
  })

  const transferData = {
    reference: "trf1",
    amount: 1000,
  }

  it("handleTransferSuccess inserts transfer", async () => {
    const client = createClient({
      transfers: {
        insert: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleTransferSuccess(transferData as any, client)
    expect(client.from("transfers").insert).toHaveBeenCalled()
  })

  it("handleTransferSuccess throws on error", async () => {
    const client = createClient({
      transfers: {
        insert: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
    })
    await expect(handlers.handleTransferSuccess(transferData as any, client)).rejects.toThrow()
  })

  it("handleTransferFailed updates transfer", async () => {
    const client = createClient({
      transfers: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
    })
    await handlers.handleTransferFailed(transferData as any, client)
    expect(client.from("transfers").update).toHaveBeenCalled()
  })

  it("handleTransferFailed throws on update error", async () => {
    const client = createClient({
      transfers: {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("fail") }),
      },
    })
    await expect(handlers.handleTransferFailed(transferData as any, client)).rejects.toThrow()
  })
})
