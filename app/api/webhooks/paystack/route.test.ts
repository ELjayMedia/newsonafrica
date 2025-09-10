// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

const from = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('../../../../lib/supabase', () => ({
  createAdminClient: () => ({ from }),
}))

import * as paystack from './route'

const secret = 'test_secret'

describe('Paystack webhook', () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = secret
  })

  it('verifies signature and processes charge.success', async () => {
    const payload = {
      event: 'charge.success',
      data: { reference: 'ref123', amount: 5000, status: 'success', customer: { email: 'e@example.com' } },
    }
    const body = JSON.stringify(payload)
    const signature = crypto.createHmac('sha512', secret).update(body).digest('hex')
    const req = new Request('http://localhost/api/webhooks/paystack', {
      method: 'POST',
      body,
      headers: { 'x-paystack-signature': signature },
    })
    const res = await paystack.POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true })
    expect(from).toHaveBeenCalledWith('profiles')
    expect(from).toHaveBeenCalledWith('transactions')
  })

  it('returns 401 for invalid signature', async () => {
    const payload = { event: 'charge.success', data: {} }
    const body = JSON.stringify(payload)
    const req = new Request('http://localhost/api/webhooks/paystack', {
      method: 'POST',
      body,
      headers: { 'x-paystack-signature': 'bad' },
    })
    const res = await paystack.POST(req)
    expect(res.status).toBe(401)
  })
})
