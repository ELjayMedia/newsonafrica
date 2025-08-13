import { ArticleCard } from './ArticleCard';
import type { Article } from '@/features/articles/schema';

interface ArticleListProps {
  posts: Article[];
  as?: 'ol' | 'ul';
}

export function ArticleList({ posts, as: Component = 'ol' }: ArticleListProps) {
  if (!posts?.length) return null;

  const List = Component;

  return (
    <List className="space-y-4">
      {posts.map(post => (
        <li key={post.slug}>
          <ArticleCard post={post} />
        </li>
      ))}
    </List>
  );
}
