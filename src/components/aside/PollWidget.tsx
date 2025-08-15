'use client';
import { useState } from 'react';

import type { Poll } from '@/lib/api/wordpress';
import { votePoll } from '@/lib/api/wordpress';

interface Props {
  poll: Poll;
}

export function PollWidget({ poll }: Props) {
  const [currentPoll, setCurrentPoll] = useState<Poll>(poll);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (!selected) return;
    setLoading(true);
    try {
      const updated = await votePoll(selected);
      setCurrentPoll(updated);
    } catch (err) {
      console.error('Failed to submit vote', err);
    } finally {
      setLoading(false);
    }
  }

  if (currentPoll.userHasVoted) {
    return (
      <div>
        <h3 className="font-semibold mb-2">Poll</h3>
        <p className="text-sm mb-2">{currentPoll.question}</p>
        <ul className="space-y-1">
          {currentPoll.options.map((opt) => (
            <li key={opt.id} className="flex justify-between text-sm">
              <span>{opt.label}</span>
              <span>{opt.votes}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">Poll</h3>
      <p className="text-sm mb-2">{currentPoll.question}</p>
      <form className="space-y-2">
        {currentPoll.options.map((opt) => (
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
        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleVote}
          className="mt-2 text-sm font-medium"
        >
          {loading ? 'Voting...' : 'Vote'}
        </button>
      </form>
    </div>
  );
}
