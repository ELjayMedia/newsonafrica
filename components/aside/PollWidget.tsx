'use client'
import { useState } from 'react'
import type { Poll } from '@/lib/api/wordpress'

interface Props {
  poll: Poll
}

export function PollWidget({ poll }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div>
      <h3 className="font-semibold mb-2">Poll</h3>
      <p className="text-sm mb-2">{poll.question}</p>
      <form className="space-y-2">
        {poll.options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="poll"
              value={opt.id}
              onChange={() => setSelected(opt.id)}
            />
            {opt.label}
          </label>
        ))}
        <button type="button" disabled={!selected} className="mt-2 text-sm font-medium">
          Vote
        </button>
      </form>
    </div>
  )
}
