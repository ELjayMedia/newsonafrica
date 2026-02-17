import type { ReactNode } from "react"

import { isAllowedHttpUrl } from "@/lib/comments/rich-text"

const INLINE_MARKDOWN_PATTERN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const [fullMatch] = match
    const index = match.index ?? 0

    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index))
    }

    const linkLabel = match[1]
    const linkUrl = match[2]
    const boldText = match[3]
    const italicText = match[4]
    const codeText = match[5]

    if (linkLabel && linkUrl) {
      const safeHref = isAllowedHttpUrl(linkUrl) ? linkUrl : null
      if (safeHref) {
        nodes.push(
          <a
            key={`${index}-link`}
            href={safeHref}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkLabel}
          </a>,
        )
      } else {
        nodes.push(fullMatch)
      }
    } else if (boldText) {
      nodes.push(<strong key={`${index}-bold`}>{boldText}</strong>)
    } else if (italicText) {
      nodes.push(<em key={`${index}-italic`}>{italicText}</em>)
    } else if (codeText) {
      nodes.push(
        <code key={`${index}-code`} className="bg-gray-100 px-1 py-0.5 rounded">
          {codeText}
        </code>,
      )
    } else {
      nodes.push(fullMatch)
    }

    lastIndex = index + fullMatch.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export function renderRichTextComment(body: string): ReactNode {
  const lines = body.split("\n")
  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`}>
      {renderInlineMarkdown(line)}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </span>
  ))
}
