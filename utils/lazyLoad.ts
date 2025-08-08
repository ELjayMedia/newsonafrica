import { Buffer as BufferPolyfill } from "buffer"

export function generateBlurDataURL(width: number, height: number): string {
  // Use a smaller, more efficient SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="100%" height="100%" fill="#EEEEEE"/>
      <rect width="100%" height="100%" fill="#EEEEEE" filter="url(#b)"/>
    </svg>`

  const buffer = typeof Buffer !== "undefined" ? Buffer : BufferPolyfill
  const encoded = buffer.from(svg).toString("base64")
  return `data:image/svg+xml;base64,${encoded}`
}
