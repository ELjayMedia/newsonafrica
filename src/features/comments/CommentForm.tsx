'use client';
import { useState, useTransition } from 'react';
import { submitComment } from './actions';
export default function CommentForm({ slug, articleId }: { slug: string; articleId: string }) {
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await submitComment(slug, articleId, body);
          setBody('');
        });
      }}
    >
      <textarea
        required
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full border rounded p-2"
      />
      <button disabled={pending} className="mt-2 btn-primary">
        {pending ? 'Sending…' : 'Post'}
      </button>
      <p className="text-sm text-muted">Comments appear after approval.</p>
    </form>
  );
}
