import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("@/app/EditionLayoutShell", () => ({
  EditionLayoutShell: ({ countryCode }: { countryCode: string }) => (
    <div data-testid="edition-shell" data-country={countryCode} />
  ),
}))

const resolveCountryMock = vi.fn(() => "ng")
vi.mock("@/lib/utils/routing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils/routing")>()
  return {
    ...actual,
    resolveCountryForLayout: resolveCountryMock,
  }
})

describe("[countryCode] layout", () => {
  it("reads the edition from params", async () => {
    const { default: CountryLayout } = await import("./layout")

    const ui = (
      <CountryLayout params={{ countryCode: "ng" }}>
        <div>Country page</div>
      </CountryLayout>
    )

    const { getByTestId } = render(ui)

    expect(resolveCountryMock).toHaveBeenCalledWith("ng")
    expect(getByTestId("edition-shell")).toHaveAttribute("data-country", "ng")
  })
})
