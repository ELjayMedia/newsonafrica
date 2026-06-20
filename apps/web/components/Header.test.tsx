import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { HeaderClient, type HeaderCategory } from "@/components/HeaderClient"
import { sortCategoriesByPreference } from "@/components/header-utils"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe("sortCategoriesByPreference", () => {
  const categories: HeaderCategory[] = [
    { id: 1, name: "Business", slug: "business" },
    { id: 2, name: "News", slug: "news" },
    { id: 3, name: "Sport", slug: "sport" },
    { id: 4, name: "Culture", slug: "culture" },
  ]

  it("returns alphabetical order when no sections are provided", () => {
    const result = sortCategoriesByPreference(categories, [])
    expect(result.map((category) => category.slug)).toEqual(["business", "culture", "news", "sport"])
  })

  it("prioritizes sections while keeping alphabetical order for the rest", () => {
    const result = sortCategoriesByPreference(categories, ["sport", "news"])
    expect(result.map((category) => category.slug)).toEqual(["sport", "news", "business", "culture"])
  })

  it("ignores unknown sections without affecting ordering", () => {
    const result = sortCategoriesByPreference(categories, ["unknown", "sport"])
    expect(result.map((category) => category.slug)).toEqual(["sport", "business", "culture", "news"])
  })
})

describe("HeaderClient", () => {
  const categories: HeaderCategory[] = [
    { id: 1, name: "Business", slug: "business" },
    { id: 2, name: "News", slug: "news" },
    { id: 3, name: "Sport", slug: "sport" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders categories in the provided order", () => {
    render(<HeaderClient categories={categories} countryCode="sz" />)

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)

    const labels = items.map((item) => within(item).getByRole("link").textContent)
    expect(labels).toEqual(["BUSINESS", "NEWS", "SPORT"])
  })
})
