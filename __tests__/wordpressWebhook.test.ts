/**
 * @jest-environment node
 */
import crypto from 'crypto'

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

jest.mock('@/lib/supabase', () => ({
  createAdminClient: jest.fn(() => ({})),
}))

const secret = 'testsecret'
process.env.WORDPRESS_WEBHOOK_SECRET = secret

const { POST, verifyWebhookSignature } = require('../app/api/webhooks/wordpress/route')

function buildRequest(payload: any, signature?: string) {
  const headers: Record<string, string> = {}
  if (signature) headers['x-wp-signature'] = `sha256=${signature}`
  return new Request('http://localhost/api/webhooks/wordpress', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  }) as any
}

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ foo: 'bar' })
  const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex')

  test('valid signature returns true', () => {
    expect(verifyWebhookSignature(body, validSig)).toBe(true)
  })

  test('malformed signature returns false', () => {
    expect(verifyWebhookSignature(body, '1234')).toBe(false)
  })
})

describe('POST webhook route', () => {
  const payload = { action: 'unknown', post: {} }

  test('returns 401 when signature is missing', async () => {
    const req = buildRequest(payload)
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('returns 401 when signature malformed', async () => {
    const req = buildRequest(payload, '1234')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  test('returns 200 with valid signature', async () => {
    const body = JSON.stringify(payload)
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
    const req = buildRequest(payload, sig)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
