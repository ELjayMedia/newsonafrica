interface StyledPostContentProps {
  content: string;
  className?: string;
}

export function StyledPostContent({ content, className = '' }: StyledPostContentProps) {
  if (!content) {
    return null;
  }

  return (
    <div
      className={`prose prose-lg max-w-none mb-8 dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
