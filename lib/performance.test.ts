import { describe, it, expect, vi } from 'vitest'
import { debounce, throttle, memoize, measureRenderTime } from './performance'

// tests for debounce

describe('performance utilities', () => {
  it('debounce limits function calls', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    debounced('b')
    vi.advanceTimersByTime(50)
    debounced('c')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
    vi.useRealTimers()
  })

  it('throttle limits calls within time window', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    throttled('b')
    vi.advanceTimersByTime(100)
    throttled('c')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'a')
    expect(fn).toHaveBeenNthCalledWith(2, 'c')
    vi.useRealTimers()
  })

  it('memoize caches function results', () => {
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoize(fn)
    expect(memoized(2)).toBe(4)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(memoized(2)).toBe(4)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('measureRenderTime logs render duration', () => {
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValueOnce(0)
    nowSpy.mockReturnValueOnce(50)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const stop = measureRenderTime('TestComponent')
    stop()
    expect(logSpy).toHaveBeenCalledWith('[Performance] TestComponent rendered in 50.00ms')
    nowSpy.mockRestore()
    logSpy.mockRestore()
  })
})
