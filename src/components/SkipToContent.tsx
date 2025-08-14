import React from 'react';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 rounded bg-white px-4 py-2 text-black"
    >
      Skip to main content
    </a>
  );
}

export default SkipToContent;
