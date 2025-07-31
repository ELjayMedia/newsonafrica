import assert from 'assert'
import { getBookmarkStats } from '../utils/supabase/getBookmarkStats'

;(async () => {
  const expected = { total: 5, unread: 2, categories: { news: 3 } }
  let called: { name: string; params: any } | null = null
  const fakeSupabase = {
    rpc(name: string, params: any) {
      called = { name, params }
      return {
        single() {
          return Promise.resolve({ data: expected, error: null })
        },
      }
    },
  } as any

  const stats = await getBookmarkStats('user123', fakeSupabase)
  assert.deepStrictEqual(called, {
    name: 'get_bookmark_stats',
    params: { user_uuid: 'user123' },
  })
  assert.deepStrictEqual(stats, expected)
  console.log('getBookmarkStats test passed')
})()
