const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || ""

export async function revalidateTags(tags: string[]) {
  const secret = process.env.REVALIDATION_SECRET
  if (!secret) {
    console.warn("REVALIDATION_SECRET not configured")
    return
  }

  await Promise.all(
    tags.map((tag) =>
      fetch(
        `${BASE_URL}/api/revalidate?secret=${secret}&tag=${encodeURIComponent(tag)}`,
        { method: "GET" },
      ),
    ),
  )
}
