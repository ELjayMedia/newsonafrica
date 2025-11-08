import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

vi.mock("server-only", () => ({}))

const homeContentMock = vi.fn(() => <div data-testid="home-content" />)
const notFoundMock = vi.fn<never, []>()

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}))

vi.mock("@/components/HomeContent", () => ({
  HomeContent: homeContentMock,
}))

beforeAll(() => {
  process.env.NEXT_PUBLIC_WP_SZ_GRAPHQL = "https://newsonafrica.com/sz/graphql"
  process.env.NEXT_PUBLIC_WP_ZA_GRAPHQL = "https://newsonafrica.com/za/graphql"
})

beforeEach(() => {
  vi.clearAllMocks()
  notFoundMock.mockImplementation(() => {
    throw new Error("notFound called")
  })
})

afterEach(() => {
  cleanup()
})

describe("CountryPage", () => {
  it.each([
    ["sz", "sz"],
    ["ZA", "za"],
    ["ng", "ng"],
    ["KE", "ke"],
    ["tz", "tz"],
    ["Eg", "eg"],
    ["GH", "gh"],
  ])("provides HomeContent props for the %s edition", async (countryCode, expectedCode) => {
    const homeData = await import("../(home)/home-data")
    const fakeProps = {
      initialPosts: [{ id: `${expectedCode}-initial` }] as any,
      featuredPosts: [{ id: `${expectedCode}-featured` }] as any,
      countryPosts: { [expectedCode]: [{ id: `${expectedCode}-post` }] } as any,
      initialData: {
        taggedPosts: [],
        recentPosts: [],
        categories: [],
        featuredPosts: [],
      },
    }
    const propsSpy = vi
      .spyOn(homeData, "buildHomeContentPropsForEdition")
      .mockResolvedValue(fakeProps)

    const { default: CountryPage } = await import("./page")

    const countryUi = await CountryPage({ params: { countryCode } })
    render(countryUi)

    expect(homeContentMock).toHaveBeenCalledTimes(1)
    const [props] = homeContentMock.mock.calls[0]

    expect(props).toEqual(fakeProps)
    expect(props.countryPosts).toHaveProperty(expectedCode)
    expect(notFoundMock).not.toHaveBeenCalled()
    expect(propsSpy).toHaveBeenCalledTimes(1)
    propsSpy.mockRestore()
  })

  it("uses the aggregated home feed for the African edition fallback", async () => {
    const homeData = await import("../(home)/home-data")
    const propsSpy = vi.spyOn(homeData, "buildHomeContentPropsForEdition")

    const { default: CountryPage } = await import("./page")

    const countryUi = await CountryPage({ params: { countryCode: "african-edition" } })
    render(countryUi)

    expect(homeContentMock).toHaveBeenCalledTimes(1)
    const [props] = homeContentMock.mock.calls[0]

    const expectedProps = await propsSpy.mock.results[0]?.value
    expect(expectedProps).toBeDefined()
    expect(props).toEqual(expectedProps)
    expect(props.countryPosts).toHaveProperty("african-edition")
    expect(notFoundMock).not.toHaveBeenCalled()
    propsSpy.mockRestore()
  })

  it("invokes notFound for unsupported country codes", async () => {
    const { default: CountryPage } = await import("./page")

    const notFoundError = new Error("NEXT_NOT_FOUND")
    notFoundMock.mockImplementation(() => {
      throw notFoundError
    })

    await expect(CountryPage({ params: { countryCode: "xx" } })).rejects.toThrow(notFoundError)

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(homeContentMock).not.toHaveBeenCalled()
  })
})
