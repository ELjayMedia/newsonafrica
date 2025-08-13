'use client';
import { useState, useTransition } from 'react';
import { signInWithEmail } from '@/features/auth/actions';
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();
  return (
    <main className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => await signInWithEmail(email));
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />
        <button disabled={pending} className="btn-primary w-full">
          {pending ? 'Sending...' : 'Send magic link'}
        </button>
      </form>
    </main>
  );
}
