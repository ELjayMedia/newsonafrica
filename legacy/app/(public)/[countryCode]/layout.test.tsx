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

    // CountryLayout is an async server component whose `params` is a promise
    // (Next.js 15). Invoke it directly and await the resolved element rather
    // than letting React try to render the un-awaited async component.
    const ui = await CountryLayout({
      params: Promise.resolve({ countryCode: "ng" }),
      children: <div>Country page</div>,
    })

    const { getByTestId } = render(ui)

    expect(resolveCountryMock).toHaveBeenCalledWith("ng")
    expect(getByTestId("edition-shell")).toHaveAttribute("data-country", "ng")
  })
})
