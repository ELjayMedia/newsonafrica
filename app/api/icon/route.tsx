import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { logRequest, withCors } from "@/lib/api-utils"

// Cache policy: very long (24 hours)
export const revalidate = 86400

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  logRequest(request)
  const searchParams = request.nextUrl.searchParams
  const size = Number.parseInt(searchParams.get("size") || "192", 10)

  // Create a simple icon with text
  const svgBuffer = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#000000"/>
      <text x="50%" y="50%" font-family="Arial" font-size="${size / 4}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">NoA</text>
    </svg>
  `)

  // Convert SVG to PNG
  const pngBuffer = await sharp(svgBuffer).resize(size, size).png().toBuffer()
  const pngArrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength,
  )

  // Return the PNG image
  return withCors(
    request,
    new NextResponse(pngArrayBuffer as ArrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }),
  )
}
