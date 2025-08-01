import { countRecords, clearQueryCache } from "../utils/supabase-query-utils"

const selectMock = jest.fn().mockReturnValue(Promise.resolve({ count: 1, error: null }))

jest.mock("../utils/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: selectMock,
    }),
  }),
}))

describe("supabase-query-utils cache", () => {
  beforeEach(() => {
    clearQueryCache()
    selectMock.mockClear()
  })

  it("caches identical filter queries", async () => {
    const filter = (q: any) => q
    await countRecords("test", filter)
    await countRecords("test", filter)
    expect(selectMock).toHaveBeenCalledTimes(1)
  })

  it("evicts entries after ttl", async () => {
    const filter = (q: any) => q
    await countRecords("test", filter, { ttl: 50 })
    await new Promise((r) => setTimeout(r, 60))
    await countRecords("test", filter, { ttl: 50 })
    expect(selectMock).toHaveBeenCalledTimes(2)
  })
})
