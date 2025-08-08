import assert from 'assert'

;(async function () {
  delete process.env.NEXT_PUBLIC_WP_BASE_URL
  try {
    await import('../lib/getCountryEndpoints?case=missing')
    assert.fail('Import should fail when NEXT_PUBLIC_WP_BASE_URL is missing')
  } catch (err) {
    assert.ok(
      err instanceof Error && err.message.includes('NEXT_PUBLIC_WP_BASE_URL'),
      'should throw descriptive error when NEXT_PUBLIC_WP_BASE_URL is missing',
    )
  }

  process.env.NEXT_PUBLIC_WP_BASE_URL = 'https://example.com'
  delete process.env.NEXT_PUBLIC_DEFAULT_COUNTRY
  const { getCountryEndpoints } = await import('../lib/getCountryEndpoints?case=present')
  const fallback = getCountryEndpoints()
  assert.strictEqual(fallback.graphql, 'https://example.com/sz/graphql')
  assert.strictEqual(fallback.rest, 'https://example.com/sz')

  const { graphql, rest } = getCountryEndpoints('ng')
  assert.strictEqual(graphql, 'https://example.com/ng/graphql')
  assert.strictEqual(rest, 'https://example.com/ng')

  console.log('getCountryEndpoints test passed')
})()
