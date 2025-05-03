interface StyledPostContentProps {
  content: string
}

export function StyledPostContent({ content }: StyledPostContentProps) {
  return <div className="prose prose-sm text-sm max-w-none mb-8" dangerouslySetInnerHTML={{ __html: content || "" }} />
}
