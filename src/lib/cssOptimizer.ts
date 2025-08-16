import postcss from "postcss"
import cssnano from "cssnano"
import autoprefixer from "autoprefixer"

export async function optimizeCSS(css: string): Promise<string> {
  const result = await postcss([
    autoprefixer,
    cssnano({
      preset: [
        "default",
        {
          discardComments: {
            removeAll: true,
          },
        },
      ],
    }),
  ]).process(css, {
    from: undefined,
  })

  return result.css
}
