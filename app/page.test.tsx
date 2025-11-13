import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

vi.mock("server-only", () => ({}))

const homeContentMock = vi.fn((props: any) => (
  <div data-testid="home-content">
    <div data-testid="props" data-value={JSON.stringify(props)} />
    <nav data-testid="country-navigation" />
  </div>
))

vi.mock("@/components/HomeContent", () => ({
  HomeContent: homeContentMock,
}))

vi.mock("@/lib/site-url", () => ({
  getSiteBaseUrl: () => "https://example.com",
  SITE_BASE_URL: "https://example.com",
}))

vi.mock("@/lib/utils/routing", () => ({
  getServerCountry: () => "sz",
}))

describe("HomePage", () => {
  beforeEach(() => {
    homeContentMock.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("marks the route as static", async () => {
    const pageModule = await import("./page")

    expect(pageModule.dynamic).toBe("force-static")
    expect(pageModule.revalidate).toBe(false)
  })

  it("passes the server-generated payload into HomeContent", async () => {
    const snapshot = {
      hero: { id: "one" },
      secondaryStories: [{ id: "two" }],
      featuredPosts: [{ id: "three" }],
      categorySections: [],
      countryPosts: { za: [{ id: "za" }] },
      contentState: "ready",
    }

    const homeDataModule = await import("./(home)/home-data")
    const snapshotSpy = vi
      .spyOn(homeDataModule, "getHomeContentSnapshot")
      .mockResolvedValue(snapshot as any)

    const { default: Page } = await import("./page")
    const ui = await Page()
    const { getByTestId } = render(ui)

    expect(snapshotSpy).toHaveBeenCalledWith("https://example.com")
    const [props] = homeContentMock.mock.calls.at(-1) ?? []

    expect(props).toMatchObject({ ...snapshot, currentCountry: "sz" })
    expect(getByTestId("country-navigation")).toBeInTheDocument()
    expect(JSON.parse(getByTestId("props").getAttribute("data-value") ?? "{}")).toMatchObject({
      currentCountry: "sz",
    })
  })
})
