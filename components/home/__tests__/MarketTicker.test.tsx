import React from 'react'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
;(globalThis as any).expect = expect
await import('@testing-library/jest-dom')
import { MarketTicker } from '../MarketTicker'

const items = [
  { symbol: 'USD', label: 'USD/ZAR', price: 18, change: 0.1, changePct: 0.5 },
]

test('renders market ticker items', () => {
  render(<MarketTicker items={items} />)
  expect(screen.getByText('USD/ZAR')).toBeInTheDocument()
})
