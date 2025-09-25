export function generateBlurDataURL(width = 700, height = 475, color = "#f3f4f6"): string {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/></svg>`,
  ).toString("base64")}`
}
