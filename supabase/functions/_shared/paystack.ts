export interface PaystackSubscriptionPlan {
  id: string
  paystackPlanId: string
  name: string
  amount: number
  interval: string
  currency: string
  description?: string
  features?: string[]
  trial?: string
  isPopular?: boolean
  savePercentage?: number
}

export const SUBSCRIPTION_PLANS: PaystackSubscriptionPlan[] = [
  {
    id: "monthly",
    paystackPlanId: "PLN_puhcond3yermojx",
    name: "Monthly",
    amount: 8900,
    interval: "monthly",
    description: "Billed monthly, cancel anytime",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
    ],
    trial: "14 days free",
  },
  {
    id: "biannually",
    paystackPlanId: "PLN_sr9a6kz9mq8wt0n",
    name: "6 Months",
    amount: 45000,
    interval: "biannually",
    description: "Billed every 6 months",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
      "Priority customer support",
    ],
    isPopular: true,
    savePercentage: 16,
  },
  {
    id: "annually",
    paystackPlanId: "PLN_eojot8m0qq5k81a",
    name: "Annual",
    amount: 85000,
    interval: "annually",
    description: "Best value, billed annually",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
      "Priority customer support",
      "Exclusive annual subscriber events",
    ],
    savePercentage: 20,
  },
]

export interface PaystackInitializeBody {
  planId: string
  metadata?: Record<string, unknown>
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function findPlanById(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)
}

export function findPlanByPaystackId(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.paystackPlanId === planId)
}

export function parseInitializeRequest(body: unknown) {
  if (!isPlainRecord(body)) {
    throw new Error("Invalid request body")
  }

  const { planId, plan_id, plan_code, plan, metadata } = body as Record<string, unknown>
  let resolvedPlan: PaystackSubscriptionPlan | undefined

  const candidateValues = [planId, plan_id, plan_code, plan]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

  for (const value of candidateValues) {
    resolvedPlan =
      findPlanById(value) ||
      findPlanByPaystackId(value) ||
      SUBSCRIPTION_PLANS.find((p) => p.name.toLowerCase() === value.toLowerCase())
    if (resolvedPlan) {
      break
    }
  }

  if (!resolvedPlan) {
    throw new Error("Invalid or missing subscription plan")
  }

  const metadataRecord = isPlainRecord(metadata) ? { ...metadata } : {}

  return { plan: resolvedPlan, metadata: metadataRecord }
}

export function buildInitializePayload(
  email: string,
  plan: PaystackSubscriptionPlan,
  metadata: Record<string, unknown> = {},
) {
  if (!email) {
    throw new Error("Subscriber email is required")
  }

  const sanitizedMetadata = { ...metadata }

  if (!sanitizedMetadata.plan_id) {
    sanitizedMetadata.plan_id = plan.id
  }
  if (!sanitizedMetadata.plan_name) {
    sanitizedMetadata.plan_name = plan.name
  }
  if (!sanitizedMetadata.paystack_plan_id) {
    sanitizedMetadata.paystack_plan_id = plan.paystackPlanId
  }

  return {
    email,
    plan: plan.paystackPlanId,
    metadata: sanitizedMetadata,
  }
}

function toIsoString(value: unknown, fallbackIso: string | null = null) {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }
  return fallbackIso
}

function resolveSubscriptionId(data: Record<string, any>) {
  return (
    data.subscription_code ||
    data.subscription ||
    data.invoice_code ||
    data.reference ||
    data.id ||
    data.payment_id ||
    null
  )
}

function resolvePaymentId(data: Record<string, any>, fallback: string | null) {
  return data.payment_id || data.invoice_code || data.reference || data.subscription_code || fallback
}

function resolvePlanName(data: Record<string, any>) {
  const plan = data.plan || data.plan_name
  if (!plan) return "paystack"
  if (typeof plan === "string") return plan
  if (isPlainRecord(plan)) {
    const fromName = plan.name
    const fromCode = plan.plan_code
    if (typeof fromName === "string" && fromName.trim()) return fromName
    if (typeof fromCode === "string" && fromCode.trim()) return fromCode
  }
  return "paystack"
}

export interface SubscriptionUpsertPayload {
  id: string
  user_id: string
  plan: string
  status: string
  start_date: string
  end_date: string | null
  renewal_date: string | null
  payment_provider: string
  payment_id: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export function buildSubscriptionUpsert(
  data: Record<string, any>,
  userId: string,
  now: Date = new Date(),
): SubscriptionUpsertPayload {
  const nowIso = now.toISOString()
  const subscriptionId = resolveSubscriptionId(data)

  if (!subscriptionId) {
    throw new Error("Unable to determine subscription identifier")
  }

  const startDate =
    toIsoString(data.start_date) || toIsoString(data.createdAt) || toIsoString(data.created_at) || toIsoString(data.paid_at) || nowIso
  const renewalDate =
    toIsoString(data.renewal_date) ||
    toIsoString(data.next_payment_date) ||
    toIsoString(data.next_due_date) ||
    toIsoString(data.next_invoice_date) ||
    null

  const paymentId = resolvePaymentId(data, subscriptionId)

  return {
    id: String(subscriptionId),
    user_id: userId,
    plan: resolvePlanName(data),
    status: String(data.status ?? "active"),
    start_date: startDate,
    end_date: null,
    renewal_date: renewalDate,
    payment_provider: "paystack",
    payment_id: String(paymentId),
    metadata: data,
    created_at: nowIso,
    updated_at: nowIso,
  }
}

export function buildSubscriptionCancellationUpdate(now: Date = new Date()) {
  const nowIso = now.toISOString()
  return {
    status: "cancelled",
    end_date: nowIso,
    renewal_date: null,
    updated_at: nowIso,
  }
}

export function buildInvoiceMetadataUpdate(data: Record<string, any>, now: Date = new Date()) {
  return {
    metadata: data,
    updated_at: now.toISOString(),
  }
}

export function buildPaymentFailureUpdate(data: Record<string, any>, now: Date = new Date()) {
  return {
    status: "past_due",
    metadata: data,
    updated_at: now.toISOString(),
  }
}
