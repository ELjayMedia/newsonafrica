const assert = require('assert')
const { getBookmarkStats } = require('../utils/supabase/getBookmarkStats')

;(async () => {
  const expected = { total: 5, unread: 2, categories: { news: 3 } }
  let called = null
  const fakeSupabase = {
    rpc(name, params) {
      called = { name, params }
      return {
        single() {
          return Promise.resolve({ data: expected, error: null })
        },
      }
    },
  }

  const stats = await getBookmarkStats('user123', fakeSupabase)
  assert.deepStrictEqual(called, {
    name: 'get_bookmark_stats',
    params: { user_uuid: 'user123' },
  })
  assert.deepStrictEqual(stats, expected)
  console.log('getBookmarkStats test passed')
})()
