import assert from 'assert'
import { getCountryEndpoints } from '../lib/getCountryEndpoints'

;(function () {
  delete process.env.NEXT_PUBLIC_DEFAULT_COUNTRY
  process.env.NEXT_PUBLIC_WP_BASE_URL = 'https://example.com'
  const fallback = getCountryEndpoints()
  assert.strictEqual(fallback.graphql, 'https://example.com/sz/graphql')
  assert.strictEqual(fallback.rest, 'https://example.com/sz')

  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY = 'ng'
  delete process.env.NEXT_PUBLIC_WP_BASE_URL
  const missingBase = getCountryEndpoints('ng')
  assert.ok(
    missingBase.error?.includes('NEXT_PUBLIC_WP_BASE_URL'),
    'should return descriptive error when NEXT_PUBLIC_WP_BASE_URL is missing'
  )

  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY = 'ng'
  process.env.NEXT_PUBLIC_WP_BASE_URL = 'https://example.com/'
  const { graphql, rest } = getCountryEndpoints('za')
  assert.strictEqual(graphql, 'https://example.com/za/graphql')
  assert.strictEqual(rest, 'https://example.com/za')

  console.log('getCountryEndpoints test passed')
})()
