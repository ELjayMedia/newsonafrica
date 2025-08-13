import type { ReactNode } from 'react';

import type { Post, Category } from './wordpress';

/**
 * Common props shared across multiple components
 */
export interface BaseComponentProps {
  className?: string;
}

/**
 * Props for components that can have children
 */
export interface WithChildrenProps extends BaseComponentProps {
  children: ReactNode;
}

/**
 * Props for the AuthForm component
 */
export interface AuthFormProps extends BaseComponentProps {
  /**
   * Initial mode of the form (login or register)
   */
  initialMode?: 'login' | 'register';
  /**
   * Callback function when authentication is successful
   */
  onSuccess?: () => void;
  /**
   * Callback function when authentication fails
   */
  onError?: (error: Error) => void;
}

/**
 * Props for the PostList component
 */
export interface PostListProps extends BaseComponentProps {
  /**
   * Array of posts to display
   */
  posts: Post[];
  /**
   * Number of columns to display posts in
   */
  columns?: 1 | 2 | 3 | 4;
  /**
   * Whether to show the featured image
   */
  showFeaturedImage?: boolean;
  /**
   * Whether to show the excerpt
   */
  showExcerpt?: boolean;
  /**
   * Whether to show the author
   */
  showAuthor?: boolean;
  /**
   * Whether to show the date
   */
  showDate?: boolean;
  /**
   * Whether to show the category
   */
  showCategory?: boolean;
}

/**
 * Props for the FeaturedStory component
 */
export interface FeaturedStoryProps extends BaseComponentProps {
  /**
   * The post to display as featured
   */
  post: Post;
  /**
   * Whether to show the excerpt
   */
  showExcerpt?: boolean;
  /**
   * Whether to use a large layout
   */
  isLarge?: boolean;
}

/**
 * Props for the CategoryMenu component
 */
export interface CategoryMenuProps extends BaseComponentProps {
  /**
   * Array of categories to display
   */
  categories: Category[];
  /**
   * Currently active category slug
   */
  activeCategory?: string;
  /**
   * Callback when a category is selected
   */
  onCategorySelect?: (category: Category) => void;
}

/**
 * Props for the CommentForm component
 */
export interface CommentFormProps extends BaseComponentProps {
  /**
   * ID of the post to comment on
   */
  postId: number | string;
  /**
   * ID of the parent comment (for replies)
   */
  parentId?: number | string;
  /**
   * Callback when comment is submitted successfully
   */
  onSuccess?: () => void;
  /**
   * Whether the form is in reply mode
   */
  isReply?: boolean;
  /**
   * Callback to cancel reply mode
   */
  onCancelReply?: () => void;
}

/**
 * Props for the SearchForm component
 */
export interface SearchFormProps extends BaseComponentProps {
  /**
   * Initial search query
   */
  initialQuery?: string;
  /**
   * Callback when search is submitted
   */
  onSearch?: (query: string) => void;
  /**
   * Whether to show the search button
   */
  showButton?: boolean;
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
}
