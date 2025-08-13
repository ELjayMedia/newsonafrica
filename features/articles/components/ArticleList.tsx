import { ArticleCard, type ArticleCardPost } from './ArticleCard';

interface ArticleListProps {
  posts: ArticleCardPost[];
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
