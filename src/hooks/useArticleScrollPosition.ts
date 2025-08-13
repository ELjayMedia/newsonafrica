'use client';

import { useState, useEffect } from 'react';

// Key prefix for sessionStorage
const SCROLL_POSITION_KEY_PREFIX = 'article-scroll-position-';

export function useArticleScrollPosition(articleId: string) {
  // Get the initial scroll position from sessionStorage if available
  const getInitialPosition = (): number => {
    if (typeof window === 'undefined') return 0;

    const savedPosition = sessionStorage.getItem(`${SCROLL_POSITION_KEY_PREFIX}${articleId}`);
    return savedPosition ? Number.parseInt(savedPosition, 10) : 0;
  };

  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);

  // Save scroll position to sessionStorage
  const saveScrollPosition = () => {
    const currentPosition = window.scrollY;
    sessionStorage.setItem(`${SCROLL_POSITION_KEY_PREFIX}${articleId}`, currentPosition.toString());
    setScrollPosition(currentPosition);
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    const savedPosition = getInitialPosition();
    if (savedPosition > 0 && !hasRestoredPosition) {
      window.scrollTo({
        top: savedPosition,
        behavior: 'auto', // Use 'auto' instead of 'smooth' for immediate restoration
      });
      setHasRestoredPosition(true);
    }
  };

  // Clear scroll position
  const clearScrollPosition = () => {
    sessionStorage.removeItem(`${SCROLL_POSITION_KEY_PREFIX}${articleId}`);
    setScrollPosition(0);
  };

  // Handle scroll events to save position
  useEffect(() => {
    const handleScroll = () => {
      // Debounce scroll events to avoid excessive storage operations
      if (window.scrollY % 50 === 0 || window.scrollY === 0) {
        // Save every 50px or at top
        saveScrollPosition();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Save position when navigating away
    window.addEventListener('beforeunload', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', saveScrollPosition);
      // Save final position when unmounting
      saveScrollPosition();
    };
  }, [articleId]);

  // Attempt to restore position on initial render
  useEffect(() => {
    // Small delay to ensure the DOM is fully loaded
    const timer = setTimeout(() => {
      restoreScrollPosition();
    }, 100);

    return () => clearTimeout(timer);
  }, [articleId]);

  return {
    scrollPosition,
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
    hasRestoredPosition,
  };
}
