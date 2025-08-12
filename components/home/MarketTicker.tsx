'use client'
import React from 'react'
import type { MarketItem } from '@/lib/api/wordpress'

interface Props {
  items: MarketItem[]
}

export function MarketTicker({ items }: Props) {
  return (
    <div className="bg-gray-50 overflow-x-auto">
      <div className="flex gap-4 px-4 py-2 text-sm">
        {items.map((m) => (
          <div key={m.symbol} className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-medium">{m.label}</span>
            <span>{m.price}</span>
            <span className={m.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {m.change >= 0 ? '▲' : '▼'} {Math.abs(m.change)} ({m.changePct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
