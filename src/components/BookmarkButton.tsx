'use client';

import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import type React from 'react';
import { useOptimistic, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/contexts/BookmarksContext';
import { useUser } from '@/contexts/UserContext';
import { toggleBookmark } from '@/features/bookmarks/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  postId: string;
  title?: string;
  slug?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
  compact?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export const BookmarkButton = ({
  postId,
  title = 'Untitled Post',
  slug = '',
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true,
  compact = false,
  onBookmarkChange,
}: BookmarkButtonProps) => {
  const { user } = useUser();
  const { isBookmarked, isLoading } = useBookmarks();
  const { toast } = useToast();

  const initial = isBookmarked(postId);
  const [saved, setSaved] = useOptimistic(initial, (_: boolean, v: boolean) => v);
  const [pending, startTransition] = useTransition();

  const isDisabled = pending || isLoading;

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to bookmark articles',
        variant: 'destructive',
      });
      return;
    }

    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        await toggleBookmark(slug || postId);
        toast({
          title: next ? 'Bookmarked!' : 'Bookmark removed',
          description: next
            ? `${title} saved to your bookmarks`
            : `${title} removed from your bookmarks`,
        });
        onBookmarkChange?.(next);
      } catch (error) {
        console.error('Error toggling bookmark:', error);
        setSaved(!next);
        toast({
          title: 'Error',
          description: 'Failed to update bookmark. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const getButtonContent = () => {
    if (pending) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showText && !compact && <span className="ml-2">Saving...</span>}
        </>
      );
    }

    if (saved) {
      return (
        <>
          <BookmarkCheck className="h-4 w-4 text-blue-600 fill-current" />
          {showText && !compact && <span className="ml-2">Saved</span>}
        </>
      );
    }

    return (
      <>
        <Bookmark className="h-4 w-4" />
        {showText && !compact && <span className="ml-2">Save</span>}
      </>
    );
  };

  return (
    <Button
      variant={saved ? 'secondary' : variant}
      size={compact ? 'icon' : size}
      onClick={handleBookmarkToggle}
      disabled={isDisabled}
      className={cn(
        'transition-all duration-200',
        saved && 'bg-blue-50 border-blue-200 hover:bg-blue-100',
        isDisabled && 'opacity-50 cursor-not-allowed',
        compact && 'h-8 w-8',
        className,
      )}
      aria-label={saved ? 'Remove bookmark' : 'Add bookmark'}
      title={saved ? 'Remove from bookmarks' : 'Save to bookmarks'}
    >
      {getButtonContent()}
    </Button>
  );
};

export default BookmarkButton;
