import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/app/EditionLayoutShell", () => ({
  EditionLayoutShell: ({ countryCode }: { countryCode: string }) => (
    <div data-testid="home-shell" data-country={countryCode} />
  ),
}))

const resolveCountryMock = vi.fn(() => "sz")
vi.mock("@/lib/utils/routing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/routing")>()
  return {
    ...actual,
    resolveCountryForLayout: resolveCountryMock,
  }
})

describe("home layout", () => {
  it("falls back to the helper when no params exist", async () => {
    const { default: HomeLayout } = await import("./layout")

    const ui = <HomeLayout>Home</HomeLayout>
    const { getByTestId } = render(ui)

    expect(resolveCountryMock).toHaveBeenCalledWith(undefined)
    expect(getByTestId("home-shell")).toHaveAttribute("data-country", "sz")
  })
})
