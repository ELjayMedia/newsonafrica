import React from 'react'
import { render } from '@testing-library/react'
import { AdSense } from '../components/AdSense'

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: () => null, inView: true }),
}))

describe('AdSense timers', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('clears timers on unmount', () => {
    const { unmount } = render(React.createElement(AdSense, { slot: '123', minWidth: 0 }))
    expect(jest.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(jest.getTimerCount()).toBe(0)
  })
})
