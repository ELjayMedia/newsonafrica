import { isUsingBrowserNavigation, isPageReload } from "../utils/navigation-utils"

describe("isUsingBrowserNavigation", () => {
  let originalPerformance: any

  beforeEach(() => {
    originalPerformance = window.performance
  })

  afterEach(() => {
    Object.defineProperty(window, "performance", { value: originalPerformance, configurable: true })
  })

  it("detects back/forward navigation via performance.navigation", () => {
    Object.defineProperty(window, "performance", { value: { navigation: { type: 2 } }, configurable: true })
    expect(isUsingBrowserNavigation()).toBe(true)
  })

  it("detects back/forward navigation via Navigation Timing API", () => {
    Object.defineProperty(window, "performance", {
      value: {
        navigation: undefined,
        getEntriesByType: () => [{ type: "back_forward" }],
      },
      configurable: true,
    })
    expect(isUsingBrowserNavigation()).toBe(true)
  })
})

describe("isPageReload", () => {
  let originalPerformance: any

  beforeEach(() => {
    originalPerformance = window.performance
  })

  afterEach(() => {
    Object.defineProperty(window, "performance", { value: originalPerformance, configurable: true })
  })

  it("detects reload via performance.navigation", () => {
    Object.defineProperty(window, "performance", { value: { navigation: { type: 1 } }, configurable: true })
    expect(isPageReload()).toBe(true)
  })

  it("detects reload via Navigation Timing API", () => {
    Object.defineProperty(window, "performance", {
      value: {
        navigation: undefined,
        getEntriesByType: () => [{ type: "reload" }],
      },
      configurable: true,
    })
    expect(isPageReload()).toBe(true)
  })

  it("returns false when not a reload", () => {
    Object.defineProperty(window, "performance", {
      value: {
        navigation: undefined,
        getEntriesByType: () => [{ type: "navigate" }],
      },
      configurable: true,
    })
    expect(isPageReload()).toBe(false)
  })
})
