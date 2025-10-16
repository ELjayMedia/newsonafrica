"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ArticleBlock =
  | { type: "paragraph"; html: string }
  | { type: "heading"; level: number; html: string }
  | { type: "list"; tag: "ul" | "ol"; html: string }
  | { type: "blockquote"; html: string }
  | { type: "code"; tag: "pre" | "code"; html: string }
  | { type: "table"; html: string }
  | { type: "hr" }
  | { type: "embed"; html: string }

type ArticleBodyProps = {
  html: string
  className?: string
  /**
   * Render prop invoked after every Nth paragraph based on `adFrequency`.
   * Returning null will skip rendering the ad placeholder.
   */
  renderAd?: (context: { paragraphIndex: number; blockIndex: number }) => ReactNode
  /**
   * Determines how often ads should appear (e.g. every 3 paragraphs).
   * Set to 0 to disable ad slots.
   */
  adFrequency?: number
}

export function ArticleBody({ html, className, renderAd, adFrequency = 0 }: ArticleBodyProps) {
  const blocks = parseHtmlToBlocks(html)

  let paragraphCount = 0
  const content: ReactNode[] = []

  blocks.forEach((block, index) => {
    content.push(renderBlock(block, index))

    if (block.type === "paragraph") {
      paragraphCount += 1

      if (renderAd && adFrequency > 0 && paragraphCount % adFrequency === 0) {
        const ad = renderAd({ paragraphIndex: paragraphCount, blockIndex: index })

        if (ad) {
          content.push(
            <div key={`ad-${paragraphCount}-${index}`} className="my-10 flex justify-center">
              {ad}
            </div>,
          )
        }
      }
    }
  })

  return <div className={cn("flex flex-col", className)}>{content}</div>
}

function parseHtmlToBlocks(html: string): ArticleBlock[] {
  if (!html) {
    return []
  }

  if (typeof DOMParser === "undefined") {
    return []
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html")
  const container = doc.body.firstElementChild

  if (!container) {
    return []
  }

  const blocks: ArticleBlock[] = []

  collectBlocks(container.childNodes, blocks)

  return blocks
}

function collectBlocks(nodes: Iterable<Node> | ArrayLike<Node>, blocks: ArticleBlock[]) {
  Array.from(nodes).forEach((node) => {
    if (!node) {
      return
    }

    if (isTextNode(node)) {
      const text = node.textContent?.trim() ?? ""

      if (text.length > 0) {
        blocks.push({ type: "paragraph", html: text })
      }

      return
    }

    if (!isElementNode(node)) {
      return
    }

    const element = node as Element
    const tag = element.tagName?.toLowerCase()

    if (!tag) {
      return
    }

    if (tag === "p") {
      if ((element.textContent ?? "").trim().length === 0) {
        return
      }

      blocks.push({ type: "paragraph", html: element.innerHTML })
      return
    }

    if (/^h[1-6]$/.test(tag)) {
      blocks.push({ type: "heading", level: Number(tag.replace("h", "")), html: element.innerHTML })
      return
    }

    if (tag === "ul" || tag === "ol") {
      blocks.push({ type: "list", tag, html: element.innerHTML })
      return
    }

    if (tag === "blockquote") {
      blocks.push({ type: "blockquote", html: element.innerHTML })
      return
    }

    if (tag === "pre") {
      blocks.push({ type: "code", tag: "pre", html: element.innerHTML })
      return
    }

    if (tag === "code") {
      blocks.push({ type: "code", tag: "code", html: element.innerHTML })
      return
    }

    if (tag === "hr") {
      blocks.push({ type: "hr" })
      return
    }

    if (tag === "table") {
      blocks.push({ type: "table", html: element.outerHTML })
      return
    }

    if (isEmbedNode(element)) {
      blocks.push({ type: "embed", html: element.outerHTML })
      return
    }

    if (element.childNodes && element.childNodes.length > 0) {
      collectBlocks(element.childNodes, blocks)
      return
    }

    blocks.push({ type: "embed", html: element.outerHTML })
  })
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function isEmbedNode(node: Element) {
  const tag = node.tagName?.toLowerCase()

  if (!tag) {
    return false
  }

  if (["figure", "iframe", "video", "audio"].includes(tag)) {
    return true
  }

  const className = node.getAttribute("class") ?? ""
  const dataProvider = node.getAttribute("data-provider") ?? ""

  return [className, dataProvider].some((value) =>
    ["embed", "twitter", "instagram", "tiktok", "facebook", "wp-block-embed", "wp-block-gallery"].some((match) =>
      value?.toLowerCase().includes(match),
    ),
  )
}

function renderBlock(block: ArticleBlock, index: number): ReactNode {
  switch (block.type) {
    case "paragraph": {
      return (
        <p
          key={`paragraph-${index}`}
          className="mb-6 text-lg leading-relaxed text-foreground last:mb-0 [&>a]:text-primary [&>a]:font-medium [&>a]:underline-offset-4 [&>a]:transition-colors [&>a]:hover:underline [&>strong]:font-semibold [&>em]:italic [&>img]:my-8 [&>img]:rounded-xl [&>img]:shadow-lg [&>code]:rounded [&>code]:bg-muted [&>code]:px-2 [&>code]:py-1 [&>code]:text-sm"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "heading": {
      const headingClasses: Record<number, string> = {
        1: "mt-12 mb-6 text-4xl font-bold leading-tight text-foreground first:mt-0",
        2: "mt-12 mb-6 text-3xl font-bold leading-tight text-foreground first:mt-0",
        3: "mt-10 mb-4 text-2xl font-semibold leading-snug text-foreground",
        4: "mt-8 mb-3 text-xl font-semibold leading-snug text-foreground",
        5: "mt-6 mb-3 text-lg font-semibold leading-snug text-foreground",
        6: "mt-4 mb-2 text-base font-semibold uppercase tracking-wide text-foreground/90",
      }

      const Tag = (`h${block.level}` as keyof JSX.IntrinsicElements) ?? "h3"

      return (
        <Tag
          key={`heading-${index}`}
          className={headingClasses[block.level] ?? headingClasses[3]}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "list": {
      const baseClassName =
        "mb-6 ml-6 space-y-2 text-lg leading-relaxed text-foreground [&>li]:pl-1 [&>li]:marker:text-primary [&>li>strong]:font-semibold"

      if (block.tag === "ul") {
        return (
          <ul
            key={`list-${index}`}
            className={cn(baseClassName, "list-disc")}
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        )
      }

      return (
        <ol
          key={`list-${index}`}
          className={cn(baseClassName, "list-decimal")}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "blockquote": {
      return (
        <blockquote
          key={`blockquote-${index}`}
          className="my-8 border-l-4 border-primary bg-muted/40 px-6 py-4 text-lg leading-relaxed text-foreground/90 [&>p]:mb-3 [&>p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "code": {
      if (block.tag === "pre") {
        return (
          <pre
            key={`code-${index}`}
            className="my-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        )
      }

      return (
        <code
          key={`code-${index}`}
          className="my-4 inline-block rounded border border-border bg-muted px-3 py-2 text-sm text-foreground"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "table": {
      return (
        <div
          key={`table-${index}`}
          className="my-8 overflow-x-auto rounded-lg border border-border bg-background [&_table]:w-full [&_table]:border-collapse [&_thead]:border-b-2 [&_thead]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_td]:border-t [&_td]:border-border [&_td]:px-4 [&_td]:py-3"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    case "hr": {
      return <hr key={`divider-${index}`} className="my-10 border-border" />
    }
    case "embed": {
      return (
        <div
          key={`embed-${index}`}
          className="my-10 flex flex-col gap-4 [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border-0 [&_figure]:m-0 [&_figcaption]:mt-3 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_img]:mx-auto [&_img]:rounded-xl [&_img]:shadow-lg"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      )
    }
    default:
      return null
  }
}
