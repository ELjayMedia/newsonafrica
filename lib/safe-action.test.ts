import { describe, expect, it, vi } from "vitest"

import { safeAction, safeActionWithFallback } from "./safe-action"

describe("safeAction", () => {
  it("returns the wrapped function's result on success without logging", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await safeAction({ name: "op.success" }, async () => 42)

    expect(result).toBe(42)
    expect(spy).not.toHaveBeenCalled()

    spy.mockRestore()
  })

  it("logs structured JSON and rethrows on failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const boom = new Error("boom")

    await expect(
      safeAction({ name: "op.fail", meta: { slug: "a" } }, async () => {
        throw boom
      }),
    ).rejects.toBe(boom)

    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload.level).toBe("error")
    expect(payload.message).toBe("op.fail")
    expect(payload.slug).toBe("a")
    expect(payload.errorName).toBe("Error")
    expect(payload.errorMessage).toBe("boom")
    expect(typeof payload.durationMs).toBe("number")

    spy.mockRestore()
  })

  it("handles non-Error throws by recording the raw value", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      safeAction({ name: "op.string-throw" }, async () => {
        throw "oops"
      }),
    ).rejects.toBe("oops")

    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload.error).toBe("oops")

    spy.mockRestore()
  })
})

describe("safeActionWithFallback", () => {
  it("returns the value on success", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await safeActionWithFallback(
      { name: "fb.success" },
      async () => [1, 2, 3],
      [],
    )

    expect(result).toEqual([1, 2, 3])
    expect(spy).not.toHaveBeenCalled()

    spy.mockRestore()
  })

  it("logs and returns the fallback on failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await safeActionWithFallback(
      { name: "fb.fail" },
      async () => {
        throw new Error("nope")
      },
      [] as number[],
    )

    expect(result).toEqual([])
    expect(spy).toHaveBeenCalledTimes(1)
    const payload = JSON.parse(spy.mock.calls[0][0] as string)
    expect(payload.message).toBe("fb.fail")
    expect(payload.errorMessage).toBe("nope")

    spy.mockRestore()
  })
})
