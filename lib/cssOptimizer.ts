import postcss from "postcss"
import autoprefixer from "autoprefixer"

const COMMENT_PATTERN = /\/\*[^!][\s\S]*?\*\//g
const WHITESPACE_AROUND_SYMBOLS = /\s*([{}:;,>])\s*/g
const EXTRA_SPACES = /\s+/g

function minify(css: string): string {
  return css
    .replace(COMMENT_PATTERN, "")
    .replace(WHITESPACE_AROUND_SYMBOLS, "$1")
    .replace(EXTRA_SPACES, " ")
    .replace(/;}/g, "}")
    .trim()
}

export async function optimizeCSS(css: string): Promise<string> {
  const result = await postcss([autoprefixer]).process(css, {
    from: undefined,
  })

  return minify(result.css)
}
