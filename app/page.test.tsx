import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

vi.mock("server-only", () => ({}))

const homeContentMock = vi.fn(
  ({ initialData }: { initialData: { taggedPosts: unknown[] } }) => (
    <div data-testid="home-content">
      <div data-testid="initial-data" data-value={JSON.stringify(initialData)} />
      <nav data-testid="country-navigation" />
    </div>
  ),
)

vi.mock("@/components/HomeContent", () => ({
  HomeContent: homeContentMock,
}))

vi.mock("@/lib/site-url", () => ({
  getSiteBaseUrl: () => "https://example.com",
  SITE_BASE_URL: "https://example.com",
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

  it("passes the server-generated fallback into HomeContent", async () => {
    const snapshot = {
      initialPosts: [{ id: "one" }],
      featuredPosts: [{ id: "two" }],
      countryPosts: { za: [{ id: "za" }] },
      initialData: { taggedPosts: [{ id: "tagged" }] },
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

    expect(props).toMatchObject(snapshot)
    expect(getByTestId("country-navigation")).toBeInTheDocument()
    expect(JSON.parse(getByTestId("initial-data").getAttribute("data-value") ?? "{}")).toEqual(
      snapshot.initialData,
    )
  })
})
