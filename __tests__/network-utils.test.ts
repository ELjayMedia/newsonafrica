import { isOnline, retryWithBackoff } from "../utils/network-utils"

describe("isOnline", () => {
  let originalNavigator: any

  beforeEach(() => {
    originalNavigator = (global as any).navigator
  })

  afterEach(() => {
    Object.defineProperty(global as any, "navigator", { value: originalNavigator, configurable: true })
  })

  it("returns navigator.onLine value when available", () => {
    Object.defineProperty(global as any, "navigator", { value: { onLine: false }, configurable: true })
    expect(isOnline()).toBe(false)

    Object.defineProperty(global as any, "navigator", { value: { onLine: true }, configurable: true })
    expect(isOnline()).toBe(true)
  })

  it("returns true when navigator is undefined", () => {
    Object.defineProperty(global as any, "navigator", { value: undefined, configurable: true })
    expect(isOnline()).toBe(true)
  })
})

describe("retryWithBackoff", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("retries with exponential delays and eventually resolves", async () => {
    const task = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("success")

    const setTimeoutSpy = jest
      .spyOn(global, "setTimeout")
      .mockImplementation((fn: any, ms?: number) => {
        fn()
        return 0 as any
      })

    await expect(retryWithBackoff(task, 3, 100)).resolves.toBe("success")

    expect(task).toHaveBeenCalledTimes(3)
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 100)
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 200)
  })

  it("throws after exceeding max retries", async () => {
    const task = jest.fn<() => Promise<void>>().mockRejectedValue(new Error("fail"))

    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((fn: any, ms?: number) => {
        fn()
        return 0 as any
      })

    await expect(retryWithBackoff(task, 2, 50)).rejects.toThrow("fail")
    expect(task).toHaveBeenCalledTimes(2)
  })
})
