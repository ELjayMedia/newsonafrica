import { describe, it, expect, vi, beforeEach } from 'vitest'

const logger = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }))
vi.mock('@/utils/logger', () => ({ default: logger }))
vi.mock('@/lib/config/env', () => ({ default: {} }))
vi.mock('@/lib/paystack-utils', () => ({ startWebhookTunnel: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createAdminClient: vi.fn() }))
import {
  handleChargeSuccess,
  handleSubscriptionCreated,
  handleSubscriptionDisabled,
  handlePaymentFailed,
  handleInvoiceUpdate,
  handleTransferSuccess,
  handleTransferFailed,
  ChargeSuccessPayload,
  SubscriptionCreatedPayload,
  SubscriptionDisabledPayload,
  InvoicePaymentFailedPayload,
  InvoiceUpdatePayload,
  TransferSuccessPayload,
  TransferFailedPayload,
} from '../route'

function createUserDb(userFound: boolean) {
  const insertSubscription = vi.fn().mockResolvedValue({ error: null })
  const updateSubscription = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  })
  const insertNotification = vi.fn().mockResolvedValue({ error: null })
  const selectProfile = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(
        userFound ? { data: { id: 'user-1' }, error: null } : { data: null, error: new Error('not found') },
      ),
    }),
  })
  const from = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'profiles':
        return { select: selectProfile }
      case 'subscriptions':
        return { insert: insertSubscription, update: updateSubscription }
      case 'notifications':
        return { insert: insertNotification }
      default:
        return {}
    }
  })
  return { from, insertSubscription, updateSubscription, insertNotification }
}

function createAdminDb(success: boolean) {
  const insertNotification = vi.fn().mockResolvedValue({ error: null })
  const selectAdmins = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(
      success
        ? { data: [{ id: 'admin-1' }], error: null }
        : { data: null, error: new Error('no admins') },
    ),
  })
  const from = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'profiles':
        return { select: selectAdmins }
      case 'notifications':
        return { insert: insertNotification }
      default:
        return {}
    }
  })
  return { from, insertNotification }
}

const chargeData: ChargeSuccessPayload = {
  reference: 'ref-1',
  amount: 5000,
  status: 'success',
  paid_at: new Date().toISOString(),
  customer: { email: 'user@example.com' },
  plan: { name: 'Basic' },
}

const subCreateData: SubscriptionCreatedPayload = {
  subscription_code: 'sub-1',
  status: 'active',
  customer: { email: 'user@example.com' },
  plan: { name: 'Basic' },
  createdAt: new Date().toISOString(),
  next_payment_date: new Date().toISOString(),
}

const subDisableData: SubscriptionDisabledPayload = {
  subscription_code: 'sub-1',
  status: 'disabled',
  customer: { email: 'user@example.com' },
  disabled_on: new Date().toISOString(),
}

const invoiceFailData: InvoicePaymentFailedPayload = {
  invoice_code: 'inv-1',
  amount: 5000,
  customer: { email: 'user@example.com' },
  subscription: { code: 'sub-1' },
  status: 'failed',
}

const invoiceUpdateData: InvoiceUpdatePayload = {
  invoice_code: 'inv-1',
  amount: 5000,
  customer: { email: 'user@example.com' },
  subscription: { code: 'sub-1' },
  status: 'success',
}

const transferSuccessData: TransferSuccessPayload = {
  reference: 'trf-1',
  amount: 10000,
  status: 'success',
  recipient: 'RCP_123',
}

const transferFailedData: TransferFailedPayload = {
  reference: 'trf-2',
  amount: 10000,
  status: 'failed',
  recipient: 'RCP_123',
  reason: 'Insufficient funds',
}

describe('Paystack webhook handlers', () => {
  beforeEach(() => {
    logger.error.mockReset()
    logger.info.mockReset()
  })

  it('handles charge.success successfully', async () => {
    const db = createUserDb(true)
    await handleChargeSuccess(chargeData, db as any)
    expect(db.insertSubscription).toHaveBeenCalled()
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when charge.success user missing', async () => {
    const db = createUserDb(false)
    await handleChargeSuccess(chargeData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles subscription.create successfully', async () => {
    const db = createUserDb(true)
    await handleSubscriptionCreated(subCreateData, db as any)
    expect(db.insertSubscription).toHaveBeenCalled()
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when subscription.create user missing', async () => {
    const db = createUserDb(false)
    await handleSubscriptionCreated(subCreateData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles subscription.disable successfully', async () => {
    const db = createUserDb(true)
    await handleSubscriptionDisabled(subDisableData, db as any)
    expect(db.updateSubscription).toHaveBeenCalled()
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when subscription.disable user missing', async () => {
    const db = createUserDb(false)
    await handleSubscriptionDisabled(subDisableData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles invoice.payment_failed successfully', async () => {
    const db = createUserDb(true)
    await handlePaymentFailed(invoiceFailData, db as any)
    expect(db.updateSubscription).toHaveBeenCalled()
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when invoice.payment_failed user missing', async () => {
    const db = createUserDb(false)
    await handlePaymentFailed(invoiceFailData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles invoice.update successfully', async () => {
    const db = createUserDb(true)
    await handleInvoiceUpdate(invoiceUpdateData, db as any)
    expect(db.updateSubscription).toHaveBeenCalled()
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when invoice.update user missing', async () => {
    const db = createUserDb(false)
    await handleInvoiceUpdate(invoiceUpdateData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles transfer.success successfully', async () => {
    const db = createAdminDb(true)
    await handleTransferSuccess(transferSuccessData, db as any)
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when transfer.success fails to fetch admins', async () => {
    const db = createAdminDb(false)
    await handleTransferSuccess(transferSuccessData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })

  it('handles transfer.failed successfully', async () => {
    const db = createAdminDb(true)
    await handleTransferFailed(transferFailedData, db as any)
    expect(db.insertNotification).toHaveBeenCalled()
  })

  it('logs error when transfer.failed fails to fetch admins', async () => {
    const db = createAdminDb(false)
    await handleTransferFailed(transferFailedData, db as any)
    expect(logger.error).toHaveBeenCalled()
  })
})
