import { parse, type HTMLElement, type Node as HtmlNode, type TextNode } from "node-html-parser"

export type ArticleBlock =
  | { type: "paragraph"; html: string }
  | { type: "heading"; level: number; html: string }
  | { type: "list"; tag: "ul" | "ol"; html: string }
  | { type: "blockquote"; html: string }
  | { type: "code"; tag: "pre" | "code"; html: string }
  | { type: "table"; html: string }
  | { type: "hr" }
  | { type: "embed"; html: string }

export function parseHtmlToBlocks(html: string): ArticleBlock[] {
  if (!html) {
    return []
  }

  const root = parse(`<div>${html}</div>`, {
    lowerCaseTagName: true,
    comment: false,
  })

  const container = root.firstChild

  if (!container || !("childNodes" in container)) {
    return []
  }

  const blocks: ArticleBlock[] = []

  collectBlocks(container.childNodes ?? [], blocks)

  return blocks
}

function collectBlocks(nodes: HtmlNode[], blocks: ArticleBlock[]) {
  nodes.forEach((node) => {
    if (!node) {
      return
    }

    if (isTextNode(node)) {
      const text = node.text.trim()

      if (text.length > 0) {
        blocks.push({ type: "paragraph", html: text })
      }

      return
    }

    if (!isElementNode(node)) {
      return
    }

    const tag = node.tagName?.toLowerCase()

    if (!tag) {
      return
    }

    if (tag === "p") {
      if (node.text.trim().length === 0) {
        return
      }

      blocks.push({ type: "paragraph", html: node.innerHTML })
      return
    }

    if (/^h[1-6]$/.test(tag)) {
      blocks.push({ type: "heading", level: Number(tag.replace("h", "")), html: node.innerHTML })
      return
    }

    if (tag === "ul" || tag === "ol") {
      blocks.push({ type: "list", tag, html: node.innerHTML })
      return
    }

    if (tag === "blockquote") {
      blocks.push({ type: "blockquote", html: node.innerHTML })
      return
    }

    if (tag === "pre") {
      blocks.push({ type: "code", tag: "pre", html: node.innerHTML })
      return
    }

    if (tag === "code") {
      blocks.push({ type: "code", tag: "code", html: node.innerHTML })
      return
    }

    if (tag === "hr") {
      blocks.push({ type: "hr" })
      return
    }

    if (tag === "table") {
      blocks.push({ type: "table", html: node.toString() })
      return
    }

    if (isEmbedNode(node)) {
      blocks.push({ type: "embed", html: node.toString() })
      return
    }

    if (node.childNodes && node.childNodes.length > 0) {
      collectBlocks(node.childNodes, blocks)
      return
    }

    blocks.push({ type: "embed", html: node.toString() })
  })
}

function isElementNode(node: HtmlNode): node is HTMLElement {
  return node && typeof (node as HTMLElement).tagName === "string"
}

function isTextNode(node: HtmlNode): node is TextNode {
  return node && typeof (node as TextNode).text === "string" && !(node as HTMLElement).tagName
}

function isEmbedNode(node: HTMLElement) {
  const tag = node.tagName?.toLowerCase()

  if (!tag) {
    return false
  }

  if (["figure", "iframe", "video", "audio"].includes(tag)) {
    return true
  }

  const className = node.getAttribute?.("class") ?? ""
  const dataProvider = node.getAttribute?.("data-provider") ?? ""

  return [className, dataProvider].some((value) =>
    ["embed", "twitter", "instagram", "tiktok", "facebook", "wp-block-embed", "wp-block-gallery"].some((match) =>
      value?.toLowerCase().includes(match),
    ),
  )
}
