'use client';

import { Suspense } from 'react';

interface ClientPageProps {
  initialPosts?: any[];
}

export default function ClientPage({ initialPosts = [] }: ClientPageProps) {
  return (
    <div className="p-4">
      <h2>Client Page Working</h2>
      <p>Posts received: {initialPosts.length}</p>
      <Suspense fallback={<div>Loading...</div>}>
        <div>Content would go here</div>
      </Suspense>
    </div>
  );
}
