import { type NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  logRequest(request)
  try {
    const secret = request.nextUrl.searchParams.get("secret")

    // Check for valid secret
    if (secret !== process.env.REVALIDATION_SECRET) {
      return jsonWithCors(request, { message: "Invalid secret" }, { status: 401 })
    }

    // Revalidate all sitemap paths
    revalidatePath("/sitemap.xml")
    revalidatePath("/sitemap-index.xml")

    return jsonWithCors(request, {
      revalidated: true,
      message: "Sitemaps revalidated successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error revalidating sitemaps:", error)
    return jsonWithCors(
      request,
      {
        revalidated: false,
        message: "Error revalidating sitemaps",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
