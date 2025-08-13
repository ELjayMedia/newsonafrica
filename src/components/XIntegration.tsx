'use client';

import { Twitter } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    twttr: any;
  }
}

interface XIntegrationProps {
  url: string;
  text: string;
}

export function XIntegration({ url, text }: XIntegrationProps) {
  useEffect(() => {
    // Load the Twitter widgets script
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleShareOnX = () => {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  };

  return (
    <div>
      <Button onClick={handleShareOnX} className="flex items-center gap-2">
        <Twitter className="h-4 w-4" />
        Share on X
      </Button>
    </div>
  );
}
