export interface Category {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
  parent?: string | number;
  children?: Category[];
  color?: string;
  icon?: string;
  featured?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryNode {
  node: Category;
}

export interface CategoriesResponse {
  categories: {
    nodes: Category[];
  };
}

export type CategorySlug =
  | 'news'
  | 'business'
  | 'sport'
  | 'entertainment'
  | 'life'
  | 'health'
  | 'politics'
  | 'food'
  | 'opinion'
  | 'technology'
  | 'culture'
  | 'travel'
  | 'education'
  | 'environment';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'News', slug: 'news' },
  { id: 2, name: 'Business', slug: 'business' },
  { id: 3, name: 'Sport', slug: 'sport' },
  { id: 4, name: 'Entertainment', slug: 'entertainment' },
  { id: 5, name: 'Life', slug: 'life' },
  { id: 6, name: 'Health', slug: 'health' },
  { id: 7, name: 'Politics', slug: 'politics' },
  { id: 8, name: 'Food', slug: 'food' },
  { id: 9, name: 'Opinion', slug: 'opinion' },
];
