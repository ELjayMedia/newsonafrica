const WORDPRESS_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://newsonafrica.com/sz/graphql"

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  count?: number
}

interface MenuItem {
  id: string
  label: string
  url: string
  parentId?: string
}

interface WPData {
  categories: Category[]
  menu: MenuItem[]
}

let cachedData: WPData | null = null
let etag: string | null = null

const QUERY = `
  query CategoriesAndMenu {
    categories(first: 100, where: { hideEmpty: true }) {
      nodes {
        id
        name
        slug
        description
        count
      }
    }
    menuItems(where: { location: PRIMARY }, first: 100) {
      nodes {
        id
        label
        url
        parentId
      }
    }
  }
`

async function fetchFromWP(): Promise<WPData> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }
  if (etag) {
    headers["If-None-Match"] = etag
  }

  const res = await fetch(WORDPRESS_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: QUERY }),
    cache: "force-cache",
    next: { revalidate: 300 },
  })

  if (res.status === 304 && cachedData) {
    return cachedData
  }

  const newEtag = res.headers.get("ETag")
  if (newEtag) {
    etag = newEtag
  }

  const json = await res.json()
  const data: WPData = {
    categories: json.data?.categories?.nodes ?? [],
    menu: json.data?.menuItems?.nodes ?? [],
  }
  cachedData = data
  return data
}

export async function getCategories(): Promise<Category[]> {
  const data = await fetchFromWP()
  return data.categories
}

export async function getMenu(): Promise<MenuItem[]> {
  const data = await fetchFromWP()
  return data.menu
}

export async function getCategoriesAndMenu(): Promise<WPData> {
  return await fetchFromWP()
}

