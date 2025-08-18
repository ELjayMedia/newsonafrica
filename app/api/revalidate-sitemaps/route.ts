import logger from "@/utils/logger";
import env from "@/lib/config/env";
import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret")

    // Check for valid secret
    if (secret !== env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 })
    }

    // Revalidate all sitemap paths
    revalidatePath("/sitemap.xml")
    revalidatePath("/news-sitemap.xml")
    revalidatePath("/sitemap-index.xml")

    return NextResponse.json({
      revalidated: true,
      message: "Sitemaps revalidated successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Error revalidating sitemaps:", error)
    return NextResponse.json(
      {
        revalidated: false,
        message: "Error revalidating sitemaps",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
