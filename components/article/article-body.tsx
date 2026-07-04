import { sanitizeArticleHtml } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

export interface ArticleBodyProps {
  /** Raw `content.rendered` HTML from WordPress; sanitized here before render. */
  html: string;
  className?: string;
}

/** Renders sanitized WordPress article HTML with article typography (NOA-90). */
export function ArticleBody({ html, className }: ArticleBodyProps) {
  const sanitized = sanitizeArticleHtml(html);

  return (
    // eslint-disable-next-line react/no-danger -- sanitized via DOMPurify (lib/sanitize-html.ts)
    <div className={cn("prose-article max-w-none", className)} dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}
